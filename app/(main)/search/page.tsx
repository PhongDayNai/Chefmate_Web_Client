import { Suspense } from "react";
import SearchResultsPage from "~/routes/search-results";

export default function SearchRoutePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Đang tải kết quả...</div>}>
      <SearchResultsPage />
    </Suspense>
  );
}
