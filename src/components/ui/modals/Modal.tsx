import React, { useRef, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflow = "hidden";
    } else {
      window.document.body.style.overflow = "visible";
    }

    return () => {
      window.document.body.style.overflow = "visible";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="flex justify-center items-center fixed left-0 top-0 w-full h-full bg-[rgba(0,0,0,0.7)] z-[1000]">
          <div
            ref={modalRef}
            className="
              relative bg-[#FFF] w-[94%] sm:min-w-[500px]
              rounded-[20px] sm:max-w-[70%] md:max-w-[60%]
              overflow-y-auto no-scrollbar p-[12px] sm:p-[20px]
            "
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
};