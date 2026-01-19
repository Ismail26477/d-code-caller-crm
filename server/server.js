// Import necessary modules
import express from "express"
import followupsRouter from "./routes/followups.js"

// Create an instance of express
const app = express()

// Use followups router
app.use("/api/followups", followupsRouter)

// Other middleware and routes can be added here

// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
