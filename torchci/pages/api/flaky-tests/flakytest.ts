import type { NextApiRequest, NextApiResponse } from "next";
import fetchFlakyTests from "lib/fetchFlakyTests";
import { FlakyTestData } from "lib/types";

interface Data {}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const name = req.query.name;
  const suite = req.query.suite;
  const file = req.query.file;
  // console.log(req.query);

  // console.log(name);
  // console.log(suite);
  // console.log(file);

  let numHours = 14 * 24 + "";

  const flakyTests: FlakyTestData[] = await fetchFlakyTests(numHours, name as string, suite as string, file as string);

  res.status(200).json({flakyTests});
}
