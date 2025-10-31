#!/bin/bash

# Test WhatsApp message sending
# Usage: ./send-test-message.sh YOUR_PHONE_NUMBER

if [ -z "$1" ]; then
    echo "Usage: $0 <phone_number>"
    echo "Example: $0 9876543210"
    exit 1
fi

PHONE_NUMBER=$1
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWg5ZXZhbmcwMDAwNDF1eGUycXh1NTg3IiwiZW1haWwiOiJhZG1pbkBxdWlja2xvYW4uY29tIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsiY2FtcGFpZ246Y3JlYXRlIiwiY2FtcGFpZ246cmVhZCIsImNhbXBhaWduOnVwZGF0ZSIsImNhbXBhaWduOmRlbGV0ZSIsImNhbXBhaWduOmV4ZWN1dGUiLCJjb250YWN0OmNyZWF0ZSIsImNvbnRhY3Q6cmVhZCIsImNvbnRhY3Q6dXBkYXRlIiwiY29udGFjdDpkZWxldGUiLCJjb250YWN0OmltcG9ydCIsIm1lc3NhZ2U6cmVhZCIsIm1lc3NhZ2U6c2VuZCIsIm1lc3NhZ2U6cmVwbHkiLCJsZWFkOmNyZWF0ZSIsImxlYWQ6cmVhZCIsImxlYWQ6dXBkYXRlIiwibGVhZDpkZWxldGUiLCJsZWFkOmFzc2lnbiIsImFuYWx5dGljczpyZWFkIiwiYW5hbHl0aWNzOmV4cG9ydCIsInVzZXI6bWFuYWdlIiwic3lzdGVtOnNldHRpbmdzIiwiYXV0b21hdGlvbjptYW5hZ2UiXSwiaWF0IjoxNzYxODk1NDEyLCJleHAiOjE3NjE5ODE4MTJ9.1hh9ZUawk02n38nZuCwX3E7AZwIncTrxCQ33qFTp6RQ"

echo "🚀 Testing WhatsApp message to $PHONE_NUMBER"
echo ""

# Test 1: Simple text message
echo "📱 Test 1: Sending simple text message..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=$TOKEN" \
  -d "{
    \"phone\": \"$PHONE_NUMBER\",
    \"message\": \"Hello! This is a test message from QuickLoan app. The WhatsApp integration is working! 🎉\"
  }" \
  http://localhost:3000/api/test/whatsapp

echo ""
echo ""

# Test 2: Template message
echo "📋 Test 2: Sending template message..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=$TOKEN" \
  -d "{
    \"phone\": \"$PHONE_NUMBER\",
    \"templateName\": \"LOAN_WELCOME\",
    \"params\": [\"QL123456\"]
  }" \
  http://localhost:3000/api/test/whatsapp

echo ""
echo ""

# Test 3: OTP message
echo "🔐 Test 3: Sending OTP message..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=$TOKEN" \
  -d "{
    \"phone\": \"$PHONE_NUMBER\",
    \"templateName\": \"OTP_VERIFICATION\",
    \"params\": [\"123456\"]
  }" \
  http://localhost:3000/api/test/whatsapp

echo ""
echo ""

echo "✅ Test completed! Check your WhatsApp for messages."
echo ""
echo "💡 You can also test through the web interface:"
echo "   1. Go to http://localhost:3000/admin"
echo "   2. Login with: admin@quickloan.com / admin123"
echo "   3. Click 'Test WhatsApp' button on dashboard"
echo "   4. Use the WhatsApp Test Modal to send messages"