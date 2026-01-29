import React from "react";
import VenueSidebar from "../../components/VenueSidebar"; // Assuming you use the same sidebar component

export default function AdminVenueCalendar(props) {
  // Directly reuse VenueSidebar as it already contains the calendar logic
  // Or if you want to wrap it:
  return <VenueSidebar {...props} />;
}