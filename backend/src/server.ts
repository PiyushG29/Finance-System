import { env } from "./config/env.js";
import app from "./app.js";

app.listen(env.port, () => {
  console.log(`Backend wrapper running on http://localhost:${env.port}`);
});
