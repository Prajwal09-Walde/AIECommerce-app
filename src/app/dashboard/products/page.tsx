"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Search, Tag, DollarSign, Layers, Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, addProduct, deleteProduct } from "@/actions/product-actions";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the search input to avoid hitting database on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new searches
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // 1. TanStack Query caching mechanism with dynamic query keys for pagination/search
  const { data, isLoading } = useQuery({
    queryKey: ["products", page, debouncedSearch],
    queryFn: () => getProducts(page, 24, debouncedSearch),
  });

  const productsList = data?.products || [];
  const totalPages = data?.totalPages || 1;
  const totalProducts = data?.total || 0;

  // 2. Action Dispatch Method for Optimistic UI Updates
  const addMutation = useMutation({
    mutationFn: addProduct,
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ["products", page, debouncedSearch] });
      const previousData = queryClient.getQueryData(["products", page, debouncedSearch]);
      
      // Instantly inject optimistic product into the UI
      queryClient.setQueryData(["products", page, debouncedSearch], (old: any) => {
        if (!old) return { products: [newProduct], total: 1, totalPages: 1 };
        return {
          ...old,
          products: [{ ...newProduct, _id: "temp-id-" + Date.now() }, ...old.products],
          total: old.total + 1
        };
      });
      return { previousData };
    },
    onError: (err, newProduct, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["products", page, debouncedSearch], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["products", page, debouncedSearch] });
      const previousData = queryClient.getQueryData(["products", page, debouncedSearch]);
      
      // Instantly hide the deleted product from the UI
      queryClient.setQueryData(["products", page, debouncedSearch], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          products: old.products.filter((p: any) => p._id !== deletedId),
          total: Math.max(0, old.total - 1)
        };
      });
      return { previousData };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["products", page, debouncedSearch], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleQuickAdd = () => {
    addMutation.mutate({
      name: "Smart Watch Series " + Math.floor(Math.random() * 10),
      price: 299.99,
      stock: 45,
      category: "Electronics",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Analytics</h2>
          <p className="text-muted-foreground">
            Inventory tracking powered by TanStack Query, showing {totalProducts} dynamic catalog items.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-full md:w-[200px] lg:w-[300px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <button 
            onClick={handleQuickAdd}
            disabled={addMutation.isPending}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-xl transition-colors text-sm font-bold shadow-lg"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Quick Add
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
          <p>Querying dynamic product database...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productsList.length === 0 ? (
              <div className="col-span-full py-20 text-center text-muted-foreground border rounded-xl border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10">
                No matching product SKUs found in the collection.
              </div>
            ) : (
              productsList.map((product: any) => (
                <Card key={product._id} className="hover:shadow-md transition-shadow relative group bg-white/50 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => deleteMutation.mutate(product._id)}
                    disabled={deleteMutation.isPending}
                    className="absolute top-4 right-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-bold pr-10 truncate">{product.name}</CardTitle>
                    <Package className="h-5 w-5 text-indigo-500 opacity-20 absolute top-4 right-4 group-hover:opacity-0 transition-opacity" />
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
                        <span className="text-green-600 font-bold">${product.price?.toFixed(2)}</span>
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

          {/* Premium Pagination Control Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
