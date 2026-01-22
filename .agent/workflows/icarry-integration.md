---
description: iCarry Integration Workflow
---

# iCarry Integration Workflow

This workflow outlines how the iCarry integration is set up and how to maintain it.

## 1. Credentials
The iCarry API credentials are stored in the `.env` file:
- `ICARRY_USERNAME`
- `ICARRY_API_KEY`
- `ICARRY_BASE_URL` (Default: `https://icarry.in/api_v3`)
- `ICARRY_PICKUP_PINCODE` (Default pickup location)

## 2. Admin - Shipping an Order
1. Go to **Admin Panel > Orders**.
2. Find an order with status **Processing**.
3. Click the **View** button.
4. In the Order Details dialog, you will see a **Ship with iCarry** button (purple truck icon).
5. Click it to create a shipment.
   - This calls `POST /api/orders/:id/ship`.
   - The backend uses `utils/iCarryService.js` to send data to iCarry.
   - If successful, the order status updates to **Shipped**.
   - Tracking Number and Courier are saved to the order.
   - The customer receives a WhatsApp/Email notification.

## 3. Webhooks (Real-time Updates)
We have exposed two webhook endpoints for iCarry:

- **Shipment Updates**: `https://mansarafoods.com/api/webhooks/shipping-updates`
  - Updates order status (Shipped -> Out for Delivery -> Delivered).
  - Updates tracking number if missing.
  - Triggers notifications to the user.

- **NDR (Non-Delivery) Alerts**: `https://mansarafoods.com/api/webhooks/ndr-updates`
  - Logs the failure reason in Order Notes.
  - Sends an email alert to the Admin (`EMAIL_FEEDBACK_TO` or `EMAIL_FROM`).

## 4. User Tracking
- Users can track their order at `/order-tracking/:orderId`.
- This page displays the iCarry tracking number and status history.

## Troubleshooting
- **Logs**: Check server logs for `[iCarry]` or `[WEBHOOK]` tags.
- **Serviceability**: If shipment creation fails, check if the pincode is serviceable using the `checkServiceability` method in `iCarryService.js`.
- **Weight**: Total weight is auto-calculated from product weights. Ensure product weights are set correctly (e.g., "500g", "1kg") to avoid default fallback (0.5kg).
