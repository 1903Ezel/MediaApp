import { serve } from "https://deno.land/std@0.176.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

console.log("Hello from the Edge Function!")

// OneSignal API endpoint ve anahtarları ortam değişkenlerinden alınıyor
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")

// Ortam değişkenleri kontrolü
if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
  throw new Error("ONESIGNAL_APP_ID or ONESIGNAL_API_KEY is not set in Supabase Secrets.")
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

// Tüm kullanıcıların ID'lerini çeken fonksiyon
async function getAllUserIds(senderId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', senderId) // Gönderen hariç tüm kullanıcıları çek
    
    if (error) {
        console.error("Error fetching user IDs:", error.message)
        return []
    }
    
    // Sadece ID dizisini döndür
    return data.map(profile => profile.id)
}

// OneSignal'a bildirim gönderen ana fonksiyon
async function sendNotification(data: { contents: any, include_external_user_ids: string[] }) {
    
    if (data.include_external_user_ids.length === 0) {
        console.log("No recipients found to send notification.")
        return { status: 200, message: "No recipients found, notification skipped." }
    }

    const payload = {
        app_id: ONESIGNAL_APP_ID,
        ...data,
        // Genel Sohbet için:
        channel_for_external_user_ids: "push",
        headings: { en: "Yeni Genel Sohbet Mesajı" },
    }

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // API key, Secret'tan alındığı için Basic Auth kullanılıyor
                "Authorization": `Basic ${ONESIGNAL_API_KEY}`, 
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`OneSignal API error: ${response.status} - ${errorText}`)
            return { status: 500, message: `Failed to send notification via OneSignal: ${errorText.substring(0, 100)}` }
        }

        const result = await response.json()
        console.log("Notification sent successfully:", result)
        return { status: 200, message: "Notification sent successfully" }

    } catch (e) {
        console.error("Error during OneSignal fetch:", e.message)
        return { status: 500, message: "Internal server error during notification send." }
    }
}

serve(async (req) => {
    try {
        const { record } = await req.json()

        if (!record) {
            return new Response(
                JSON.stringify({ message: "Invalid payload: 'record' missing." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const senderId = record.sender_id
        const recipientId = record.recipient_id 
        const messageContent = record.content

        // Eğer recipientId NULL ise, genel sohbet odası mantığını uyguluyoruz
        if (recipientId === null) {
            console.log("Recipient ID is NULL. Sending to all users except sender.")

            // 1. Gönderen hariç tüm kullanıcı ID'lerini çek
            const allRecipientIds = await getAllUserIds(senderId)

            if (allRecipientIds.length === 0) {
                return new Response(
                    JSON.stringify({ message: "No other users found." }),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                )
            }
            
            // 2. Bildirim içeriği
            // Sender username değeri SQL trigger'dan geliyor.
            const senderUsername = record.sender?.username || 'Anonim Kullanıcı'

            const contents = {
                en: `${senderUsername} yeni bir genel mesaj gönderdi: "${messageContent.substring(0, 50)}..."`,
            }

            // 3. OneSignal'a gönder
            const result = await sendNotification({
                contents: contents,
                include_external_user_ids: allRecipientIds, // Tüm alıcılar
            })
            
            return new Response(
                JSON.stringify(result),
                { status: result.status, headers: { "Content-Type": "application/json" } }
            )

        } else {
            // Birebir sohbet senaryosu (şuan kullanılmıyor ama mantık burada kalıyor)
            console.log(`Recipient ID found: ${recipientId}. Sending P2P notification.`)
            // ... (P2P mantığı)
            return new Response(
                JSON.stringify({ message: "P2P logic skipped for general chat." }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            )
        }


    } catch (e) {
        console.error(`Edge function error: ${e.message}`)
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
})
