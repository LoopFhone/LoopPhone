export default async function handler(req, res) {
    // 🔍 בדיקה 1: אימות סוג הבקשה
    if (req.method !== 'POST') {
        console.warn(`⚠️ אזהרה: התקבלה בקשה מסוג ${req.method} במקום POST`);
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        console.log("--------------------------------------------------");
        console.log("🚀 תחילת תהליך עיבוד תשלום ב-Backend");

        // 🔍 בדיקה 2: האם משתנה הסביבה SMARTBEE_TOKEN מוגדר ב-Vercel?
        const smartBeeToken = process.env.SMARTBEE_TOKEN;
        if (!smartBeeToken) {
            console.error("❌ שגיאה קריטית: המשתנה SMARTBEE_TOKEN חסר בהגדרות ה-Environment Variables ב-Vercel!");
            return res.status(500).json({ 
                error: "שגיאת קונפיגורציה בשרת. משתנה הסביבה SMARTBEE_TOKEN לא הוגדר במערכת Vercel." 
            });
        }
        console.log("✅ בדיקת טוקן שרת: המשתנה קיים ונמשך בהצלחה.");

        // 🔍 בדיקה 3: האם הנתונים מסל הקניות הגיעו מהאתר?
        const cartData = req.body; 
        if (!cartData || Object.keys(cartData).length === 0) {
            console.error("❌ שגיאה: התקבל גוף בקשה (Body) ריק מהאתר!");
            return res.status(400).json({ error: "הנתונים שנשלחו מסל הקניות ריקים או פגומים." });
        }
        console.log("📦 הנתונים שהתקבלו מהסל באתר:", JSON.stringify(cartData));

        // 🚀 ביצוע הפנייה הרשמית ל-Smart Bee
        const targetUrl = "https://test.smartbee.co.il/api/v1/creditCard/createPaymentPage";
        console.log(`📡 שולח בקשה ל-Smart Bee לכתובת: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${smartBeeToken}`
            },
            body: JSON.stringify(cartData)
        });

        console.log(`📊 תגובת שרת Smart Bee - סטטוס קוד: ${response.status}`);

        // 🔍 בדיקה 4: האם שרת Smart Bee החזיר שגיאת נתיב (404) או דף HTML לבן?
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await response.text();
            console.error("❌ שגיאה קריטית: שרת Smart Bee לא החזיר JSON, אלא דף טקסט/HTML!");
            console.error("📄 תוכן התגובה הגולמית מהשרת שלהם:", rawText);
            
            if (response.status === 404) {
                return res.status(404).json({ 
                    error: "הכתובת (Endpoint) לא קיימת בשרת של Smart Bee. בדוק אותיות גדולות/קטנות בנתיב.",
                    status: 404 
                });
            }
            return res.status(500).json({ 
                error: `שרת הספק החזיר שגיאה שאינה בפורמט JSON (סטטוס ${response.status})`,
                raw: rawText.substring(0, 500) // מחזיר רק את ההתחלה כדי לא להעמיס
            });
        }

        // פענוח ה-JSON במידה והפורמט תקין
        const data = await response.json();

        // 🔍 בדיקה 5: האם ה-API שלהם החזיר שגיאה פנימית מוסמכת (כמו 400 או 401)?
        if (!response.ok) {
            console.error(`❌ שגיאה רשמית מה-API של Smart Bee (קוד ${response.status}):`, data);
            
            if (response.status === 401) {
                console.error("💡 טיפ: קוד 401 משמעותו שהטוקן שלכם לא מורשה או חסום אצלם במערכת הטסט.");
            }
            
            return res.status(response.status).json({
                error: "חברת הסליקה סירבה לבקשה",
                smartBeeResponse: data,
                status: response.status
            });
        }

        // 🎉 הצלחה מלאה!
        console.log("✅ דף התשלום נוצר בהצלחה! מחזיר את הנתונים המלאים לאתר.");
        console.log("➡️ הנתונים שיחזרו לדפדפן:", JSON.stringify(data));
        console.log("--------------------------------------------------");
        
        return res.status(200).json(data);

    } catch (error) {
        // 🔍 בדיקה 6: תפיסת קריסות בלתי צפויות (לדוגמה בעיית רשת או שרת שלהם למטה)
        console.error("❌ שגיאה חמורה (Exception) במהלך הריצה ב-Backend:");
        console.error(`📝 הודעת השגיאה: ${error.message}`);
        if (error.stack) console.error(`🚨 Stack Trace:\n${error.stack}`);
        console.log("--------------------------------------------------");
        
        return res.status(500).json({ 
            error: "אירעה שגיאה פנימית בעיבוד הנתונים בשרת ה-Backend.",
            details: error.message 
        });
    }
}
