"use client";

import { useQuery } from "@tanstack/react-query";
import { getStories } from "../api/getStories";

export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: getStories,
  });
}
