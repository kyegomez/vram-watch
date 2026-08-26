import { fetchHtml } from "../lib/adapters/http";
fetchHtml(process.argv[2]).then((h) => process.stdout.write(h));
