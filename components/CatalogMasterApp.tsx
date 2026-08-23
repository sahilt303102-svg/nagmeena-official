"use client";

import { useEffect } from "react";

export default function CatalogMasterApp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (isOpen) window.location.href = "/admin";
    else onClose();
  }, [isOpen, onClose]);
  return null;
}
