# 🏦 FormuLoan Decision System (Serverless Like)

A MINIMAL ML-powered loan approval prediction system designed to run entirely on the User's Edge. This application uses a RandomForest ensemble model translated into pure JavaScript to provide instant, on the user's machine loan predictions without any backend costs.
The full version of the site has the same frontend UI but is connected into a server that has the full loan approving algorithm.

## 🚀 Main Ideas
- **Pre-processes data** in the browser using custom JavaScript logic.
- **Executes ML inference** locally using high-performance JavaScript functions generated from trained Python models.
- **Finds alternatives** automatically for rejected loans by iterating through loan parameters in real-time.

This architecture ensures the app is **fast**, **infinitely scalable (using many CDNs)**, and **100% free to host** on platforms like Cloudflare Pages or Github Pages.

*Created as my final project in the Magshimim `מגשימים` Program.*
