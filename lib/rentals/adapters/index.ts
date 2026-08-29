import type { RentalSourceAdapter } from "../types";
import { aws } from "./aws";
import { azure } from "./azure";
import { runpod } from "./runpod";
import { shadeform } from "./shadeform";
import { vastai } from "./vastai";

/**
 * Every rental adapter is live — unlike the retail side, none of these feeds
 * block server requests or require keys, so there is no "link only" tier here.
 */
export const RENTAL_ADAPTERS: RentalSourceAdapter[] = [
  shadeform,
  runpod,
  vastai,
  aws,
  azure,
];

export { aws, azure, runpod, shadeform, vastai };
