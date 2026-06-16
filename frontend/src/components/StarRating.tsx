import { Star } from "lucide-react";

export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= Math.round(rating) ? "fill-[#FCE500] text-[#FCE500]" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </div>
  );
}
