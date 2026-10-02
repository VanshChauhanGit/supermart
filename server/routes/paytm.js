const express = require('express');
const router = express.Router();
// const PaytmChecksum = require('paytmchecksum'); // You would install this via: npm install paytmchecksum

// POST Generate Paytm Transaction Token
router.post('/generate-token', async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const mid = process.env.PAYTM_MID || "YOUR_PRODUCTION_MID_HERE";
    const merchantKey = process.env.PAYTM_MERCHANT_KEY || "YOUR_MERCHANT_KEY_HERE";
    
    // Paytm expects amount to be a string formatted to 2 decimal places
    const formattedAmount = Number(amount).toFixed(2);

    /* 
      // --- PRODUCTION IMPLEMENTATION ---
      // 1. Install 'paytmchecksum' (npm install paytmchecksum)
      // 2. Uncomment the following code to generate real tokens
      
      const paytmParams = {
        body: {
          requestType: "Payment",
          mid: mid,
          websiteName: "YOUR_WEBSITE_NAME",
          orderId: orderId,
          callbackUrl: `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${orderId}`,
          txnAmount: {
            value: formattedAmount,
            currency: "INR",
          },
          userInfo: {
            custId: "CUST_001",
          },
          // 3. To enforce 0% fee (Free UPI), restrict payment methods
          enablePaymentMode: [{ mode: "UPI", channels: ["UPI", "UPI_INTENT"] }],
          disablePaymentMode: [{ mode: "CREDIT_CARD" }, { mode: "DEBIT_CARD" }]
        }
      };

      const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), merchantKey);
      paytmParams.head = { signature: checksum };

      const post_data = JSON.stringify(paytmParams);

      const fetch = require('node-fetch'); // or axios
      const response = await fetch(`https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': post_data.length },
        body: post_data
      });
      const data = await response.json();
      
      if (data.body && data.body.txnToken) {
        return res.json({ success: true, txnToken: data.body.txnToken });
      } else {
        return res.status(400).json({ success: false, message: 'Failed to generate token', error: data });
      }
    */

    // --- MOCK IMPLEMENTATION (For UI Testing) ---
    // Since we don't have real Paytm credentials, we return a mock token.
    // The Paytm SDK will fail to open the payment page with a mock token, 
    // but this allows the React Native UI flow to be tested.
    const mockTxnToken = "mock_txn_token_" + Date.now();
    res.json({ success: true, txnToken: mockTxnToken, message: "Using mock token. Replace with production implementation." });

  } catch (err) {
    console.error("Paytm Token Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
