import express from "express"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json())

// Simulate /premium endpoint
app.post("/premium", async (req, res) => {
    const { prompt, model } = req.body
    console.log("Incoming request:", { prompt, model })

    // Check if payment header exists
    const signedTx = req.headers["x402-signed-tx"]

    // Step 1: No payment yet -> ask frontend to pay
    if (!signedTx) {
        console.log("Returning payment required")
        return res.status(402).json({
            message: "Payment required",
            paymentRequest: {
                txBase64: Buffer.from("fake_tx").toString("base64"),
                receiver: "FakeSolanaReceiverPublicKey",
                amountLamports: 500000, // mock cost (0.5 USDC)
            },
        })
    }

    // Step 2: Payment verified -> send fake AI response
    console.log("Received signedTx:", signedTx)
    await new Promise((resolve) => setTimeout(resolve, 1000)) // simulate delay

    res.json({
        paidTxSignature: "FAKE_SIGNATURE_" + Date.now(),
        ai: `✅ Mock AI response for: "${prompt}"`,
    })
})

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }))

const PORT = 3001
app.listen(PORT, () => console.log(`🚀 Mock backend running on http://localhost:${PORT}`))
