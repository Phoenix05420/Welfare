import { motion } from "framer-motion";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-8 flex items-center justify-center">
      <div className="glass inline-flex items-center gap-1 rounded-full px-2 py-1.5">
        {/* Previous */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            currentPage === 1
              ? "cursor-not-allowed text-muted-foreground/40"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          ← Prev
        </motion.button>

        {/* Page numbers */}
        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <motion.button
              key={page}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onPageChange(page)}
              className={`relative grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition ${
                currentPage === page
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {currentPage === page && (
                <motion.span
                  layoutId="pagination-active"
                  className="absolute inset-0 rounded-full gradient-hero"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{page}</span>
            </motion.button>
          ),
        )}

        {/* Next */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            currentPage === totalPages
              ? "cursor-not-allowed text-muted-foreground/40"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          Next →
        </motion.button>
      </div>
    </div>
  );
}
