// CenterNav.jsx
import React from "react";
import { createPortal } from "react-dom";

export default function CenterNav({ activeIndex, onClick }) {
  const items = [
    { i: 0, icon: "fa-solid fa-house" },
    { i: 1, icon: "fa-solid fa-sitemap" },
    { i: 2, icon: "fa-solid fa-mask" },
    { i: 3, icon: "fa-solid fa-user" },
    { i: 4, icon: "fa-regular fa-file" },
    { i: 5, icon: "fa-regular fa-bell" },
  ];

  return createPortal(
    <div className="nav-center">
      {items.map(({ i, icon }) => (
        <a
          key={i}
          onClick={() => onClick(i)}
          className={`nav-btn ${activeIndex === i ? "active" : ""}`}
        >
          <i className={icon}></i>
        </a>
      ))}
    </div>,
    document.body
  );
}
