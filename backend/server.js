import "dotenv/config"; // WAJIB paling atas: load .env sebelum modul lain baca process.env
import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
