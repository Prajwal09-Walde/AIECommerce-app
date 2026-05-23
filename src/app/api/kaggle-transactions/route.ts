import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import KaggleTransaction from "@/server/models/Transaction";
import Product from "@/server/models/Product";
import Order from "@/server/models/Order";

export const dynamic = "force-dynamic";

// GET handler: Paginated, filtered list of transactions
export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";

    const skip = (page - 1) * limit;
    const query: any = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by payment method
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Search query matches userId or productId
    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: "i" } },
        { productId: { $regex: search, $options: "i" } },
      ];
    }

    const [transactions, total] = await Promise.all([
      KaggleTransaction.find(query)
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      KaggleTransaction.countDocuments(query),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/kaggle-transactions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST handler: Bulk ingestion of transactions
export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const clearExisting = searchParams.get("clear") === "true";
    const distribute = searchParams.get("distribute") === "true";

    if (clearExisting) {
      console.log("Clearing existing Kaggle transactions as requested...");
      await KaggleTransaction.deleteMany({});
      if (distribute) {
        console.log("Clearing existing core Products and Orders as requested...");
        await Product.deleteMany({});
        await Order.deleteMany({});
      }
    }

    const body = await request.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Invalid payload. Expected a 'transactions' array." },
        { status: 400 }
      );
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        message: "No transactions to insert.",
        insertedCount: 0,
      });
    }

    console.log(`Processing ingestion for ${transactions.length} records (distribute=${distribute})...`);

    // Clean and validate data before insertion
    const validatedTransactions = transactions.map((t: any) => {
      const price = parseFloat(t.Price || t.price || "0");
      const discount = parseFloat(t["Discount (%)"] || t.discount || "0");
      const finalPrice = parseFloat(t.Final_Price || t.finalPrice || "0");

      let parsedDate = new Date();
      const rawDate = t.Purchase_Date || t.purchaseDate;
      if (rawDate) {
        // Handle MM-DD-YYYY format or other formats
        if (typeof rawDate === "string" && rawDate.includes("-")) {
          const parts = rawDate.split("-");
          if (parts.length === 3) {
            const month = parseInt(parts[0], 10) - 1;
            const day = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            parsedDate = new Date(year, month, day);
          } else {
            parsedDate = new Date(rawDate);
          }
        } else {
          parsedDate = new Date(rawDate);
        }
      }

      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }

      return {
        userId: String(t.User_ID || t.userId || "").trim(),
        productId: String(t.Product_ID || t.productId || "").trim(),
        category: String(t.Category || t.category || "General").trim(),
        price: isNaN(price) ? 0 : price,
        discount: isNaN(discount) ? 0 : discount,
        finalPrice: isNaN(finalPrice) ? 0 : finalPrice,
        paymentMethod: String(t.Payment_Method || t.paymentMethod || "Other").trim(),
        purchaseDate: parsedDate,
      };
    });

    // 1. High performance bulk insertion to main Transaction collection
    const result = await KaggleTransaction.insertMany(validatedTransactions, { ordered: false });

    // 2. High performance distribution into core collections (Product & Order)
    if (distribute) {
      // Gather all unique products from this chunk
      const uniqueProductsMap = new Map<string, any>();
      validatedTransactions.forEach((t: any) => {
        const key = `Product-${t.productId}`;
        if (!uniqueProductsMap.has(key)) {
          uniqueProductsMap.set(key, {
            productId: t.productId,
            category: t.category,
            price: t.price,
          });
        }
      });

      // Perform bulkWrite upsert on Product collection
      const productOps = Array.from(uniqueProductsMap.values()).map((p: any) => ({
        updateOne: {
          filter: { name: `Product-${p.productId}` },
          update: {
            $setOnInsert: {
              name: `Product-${p.productId}`,
              category: p.category,
              price: p.price,
              stock: Math.floor(Math.random() * 80) + 20, // Realistic inventory level
            },
          },
          upsert: true,
        },
      }));

      if (productOps.length > 0) {
        await Product.bulkWrite(productOps);
      }

      // Retrieve created products to map names to actual generated ObjectIds
      const productNames = Array.from(uniqueProductsMap.keys());
      const dbProducts = await Product.find({ name: { $in: productNames } }).lean();
      const resolvedProductsMap = new Map<string, any>();
      dbProducts.forEach((p: any) => {
        resolvedProductsMap.set(p.name, p);
      });

      // Build Order documents referencing actual Product ObjectIds
      const orderDocs = validatedTransactions.map((t: any) => {
        const key = `Product-${t.productId}`;
        const matchedProduct = resolvedProductsMap.get(key);
        return {
          customer: t.userId || `customer_${Math.floor(Math.random() * 1000)}@example.com`,
          totalAmount: t.finalPrice,
          status: "Shipped",
          items: [
            {
              productId: matchedProduct?._id,
              quantity: 1,
              price: t.finalPrice,
            },
          ],
          createdAt: t.purchaseDate,
          updatedAt: t.purchaseDate,
        };
      });

      // Bulk insert Order documents
      if (orderDocs.length > 0) {
        await Order.insertMany(orderDocs, { ordered: false });
      }
    }

    return NextResponse.json({
      message: "Ingestion completed successfully.",
      insertedCount: result.length,
      distributed: distribute,
    });
  } catch (error: any) {
    console.error("Error in POST /api/kaggle-transactions:", error);
    // If some succeeded or it's duplicate key error, we might still have partial inserts, return details
    return NextResponse.json(
      {
        error: error.message,
        insertedCount: error.insertedDocs ? error.insertedDocs.length : 0,
      },
      { status: 500 }
    );
  }
}
