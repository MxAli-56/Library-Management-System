import { useState } from "react";

const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);

  if (!text) return children;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute left-0 bottom-full mb-2 z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
};

export default Tooltip;