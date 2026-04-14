import { NextResponse } from 'next/server'
import { MOCK_EMAILS } from '@/lib/mockData'

export async function GET() {
  // Gmail integration requires OAuth flow setup
  // Structure is ready — wire up Google OAuth token and call Gmail API

  // const accessToken = // get from session/cookie
  // if (accessToken) {
  //   const gmailRes = await fetch(
  //     'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=20',
  //     { headers: { Authorization: `Bearer ${accessToken}` } }
  //   )
  //   // ... parse and return real emails
  // }

  return NextResponse.json({ emails: MOCK_EMAILS, source: 'mock' })
}
