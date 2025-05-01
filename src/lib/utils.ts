import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const fontSans = GeistSans;
export const fontMono = GeistMono;


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
