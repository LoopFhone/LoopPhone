export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        console.log("--------------------------------------------------");
        console.log("🚀 תחילת תהליך עיבוד עסקה משולב Login + הפקת מסמך");

        const providerClientId = "34c661f4-e7f7-40a2-aedb-b12d6ccbdf60"; 
        const smartBeePassword = process.env.SMARTBEE_PASSWORD; 
        const providerUserToken = process.env.SMARTBEE_TOKEN;   

        if (!smartBeePassword || !providerUserToken) {
            console.error("❌ שגיאה: משתני הסביבה SMARTBEE_PASSWORD או SMARTBEE_TOKEN חסרים ב-Vercel!");
            return res.status(500).json({ error: "Configuration error on Vercel side." });
        }

        // --------------------------------------------------
        // שלב א': התחברות (Login) וקבלת טוקן JWT זמני
        // --------------------------------------------------
        const loginUrl = "https://test.smartbee.co.il/api/v1/Login/authenticate";
        console.log("📡 פונה לביצוע Login...");

        const loginResponse = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "clientId": providerClientId,
                "password": smartBeePassword
            })
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
            console.error("❌ תהליך ה-Login נכשל בשרת סמארט בי:", loginData);
            return res.status(loginResponse.status).json({ error: "Login authentication failed", details: loginData });
        }

        // סריקה רחבה של כל שמות השדות האפשריים לטוקן (חסינות שרתים)
        const jwtToken = loginData.token || loginData.accessToken || loginData.jwtToken || (loginData.data && loginData.data.token);

        if (!jwtToken) {
            console.error("❌ ה-Login הצליח אך לא חזר טוקן JWT במבנה התשובה. מבנה שהתקבל:", loginData);
            return res.status(500).json({ error: "Failed to retrieve JWT token from login response." });
        }
        console.log("✅ ה-Login בוצע בהצלחה! התקבל טוקן JWT.");

        // --------------------------------------------------
        // שלב ב': בניית הנתונים והוספת שדות החובה של אדי
        // --------------------------------------------------
        const cartData = req.body;
        const uniqueMsgId = "LOOP-" + Date.now();

        const finalPayload = {
            ...cartData,
            "providerClientId": providerClientId,
            "providerUserToken": providerUserToken,
            "providerMsgId": uniqueMsgId,
            "providerMsgReferenceId": uniqueMsgId
        };

        // --------------------------------------------------
        // שלב ג': שליחת הבקשה להפקת מסמך עם ה-Bearer החדש
        // --------------------------------------------------
        const targetUrl = "https://test.smartbee.co.il/api/v1/Documents/create";
        console.log(`📡 שולח את הבקשה הסופית ל-Documents/create`);

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}` 
            },
            body: JSON.stringify(finalPayload)
        });

        console.log(`📊 סטטוס תגובה סופי מסמארט בי: ${response.status}`);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await response.text();
            console.error("❌ השרת לא החזיר JSON:", rawText);
            return res.status(500).json({ error: "Invalid JSON from provider", raw: rawText });
        }

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ שגיאת API מסמארט בי (קוד ${response.status}):`, data);
            return res.status(response.status).json({ error: "חברת הסליקה סירבה לבקשה", smartBeeResponse: data });
        }

        console.log("🎉 העסקה והמסמך נוצרו בהצלחה מלאה!");
        return res.status(200).json(data);

    } catch (error) {
        console.error("❌ קריסה קריטית ב-Backend:", error.message);
        return res.status(500).json({ error: "Internal server error", details: error.message });
    }
}
