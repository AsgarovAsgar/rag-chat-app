import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "@/api/auth";
import { queryKeys } from "@/api/queryKeys";

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: Infinity
  })
}