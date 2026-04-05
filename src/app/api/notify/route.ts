import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { title, body, token, serverKey } = await request.json();

    const key = serverKey || process.env.FIREBASE_SERVER_KEY;

    if (key && token) {
      const response = await fetch(
        `https://fcm.googleapis.com/fcm/send`,
        {
          method: 'POST',
          headers: {
            Authorization: `key=${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notification: { title, body, icon: '/icons/icon-192.png' },
            data: { title, body },
            to: token,
            priority: 'high',
          }),
        }
      );

      if (!response.ok) {
        console.error('FCM send failed:', await response.text());
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
