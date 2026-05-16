import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Search, Tag, DollarSign, Layers } from "lucide-react";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";

// This forces Next.js to dynamically render the page on every request, ensuring fresh data
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await connectToDatabase();
  
  // Fetch products directly from MongoDB (Server Component)
  const products = await Product.find({}).sort({ createdAt: -1 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Analytics</h2>
          <p className="text-muted-foreground">
            Inventory tracking and top-performing products fetched from MongoDB.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search products..."
            className="pl-8 h-9 w-full md:w-[300px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground border rounded-lg border-dashed">
            No products found. Please seed the database first.
          </div>
        ) : (
          products.map((product) => (
            <Card key={product._id.toString()} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">{product.name}</CardTitle>
                <Package className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center text-sm">
                    <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium mr-2">Category:</span>
                    <span className="text-muted-foreground">{product.category}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                    <span className="font-medium mr-2">Price:</span>
                    <span className="text-green-600 font-bold">${product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Layers className="mr-2 h-4 w-4 text-amber-500" />
                    <span className="font-medium mr-2">Stock Level:</span>
                    <span className={product.stock < 10 ? "text-red-500 font-bold" : "text-muted-foreground"}>
                      {product.stock} units {product.stock < 10 && "(Low)"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
