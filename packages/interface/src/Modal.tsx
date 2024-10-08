import React, { useEffect, useMemo, useRef, useState } from 'react';

// TODO before reworking this modal, look at some other popular modal APIs, such as https://www.radix-ui.com https://ui.shadcn.com/
// TODO stop exporting Modal and make useModal the only public API, and rename this file to useModal.tsx. Consider dropping `showModalNonce` in the internal design
// TODO this system seems to have many unnecessary rerenders, eg. (user hits ESC to close modal -> isVisible false -> onVisibilityChange(false) -> useModal setShowModalNonce(0) -> unecessarily re-render Modal) --> how can we clean it up?
// TODO add a modal open/close transition animation such as "transition-opacity duration-300 ease-in-out" --> however, in order to do this, a somewhat tricky opacity state machine must be managed: when the modal goes from invisible to visible, it must be immediately created with opacity 0, and then the opacity immediately changed from 0 to 100, and then it will fade in, and then when the modal is hidden, it must have its opacity immediately set to 0 but delay destruction until the fade out is complete, and then it must be destroyed --> this state machine description may not be exactly correct

// useModal is the preferred client entrypoint into our modal system.
export function useModal(children?: React.ReactNode): { modal: JSX.Element, showModal: () => void, hideModal: () => void } {
  const [showModalNonce, setShowModalNonce] = useState(0);
  const onModalVisibilityChange: (isVisible: boolean) => void = useMemo(() => (isVisible) => {
    if (!isVisible) setShowModalNonce(0);
  }, [setShowModalNonce]);

  const showModal = useMemo<() => void>(() => () => setShowModalNonce((nonce) => nonce + 1), [setShowModalNonce]);
  const hideModal = useMemo<() => void>(() => () => setShowModalNonce(0), [setShowModalNonce]);

  const modal = useMemo(() => <Modal showModalNonce={showModalNonce} onVisibilityChange={onModalVisibilityChange}>
    {children}
  </Modal>, [children, showModalNonce, onModalVisibilityChange]);

  const ret: ReturnType<typeof useModal> = useMemo(() => ({ modal, showModal, hideModal }), [modal, showModal, hideModal]);
  return ret;
}

interface ModalProps {
  showModalNonce: number; // showModalNonce lets the client hide or show the modal programmatically. If showModalNonce < 1, the modal will be hidden, otherwise the modal will be shown. A client can re-show the modal (which might have been dismissed by the user) by incrementing showModalNonce, or hide the modal by resetting showModalNonce to 0. The user can hide the modal by dismissing it in various ways.
  onVisibilityChange?: (isVisible: boolean) => void; // onVisibilityChange is called when the modal becomes visible or invisible for any reason
  children?: React.ReactNode;
}

// Modal is our basic multi-purpose modal to pop-up a dismissable dialog
// box that contains its children as content. Our Modal's API tends to
// be a lot simpler than 3rd-party modals; it's sort of a
// quick-and-dirty modal.
export const Modal: React.FC<ModalProps> = ({ showModalNonce, onVisibilityChange, children }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    onVisibilityChange?.(isModalVisible);
  }, [onVisibilityChange, isModalVisible]);

  const modalContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { // see note on showModalNonce definition
    if (showModalNonce > 0) setIsModalVisible(true);
    else setIsModalVisible(false);
  }, [showModalNonce]);

  useEffect(() => { // close modal if the user hits the ESC key or clicks outside the modal
    if (isModalVisible) {
      const handleEscKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsModalVisible(false);
        }
      };

      const handleClickOutside = (event: MouseEvent) => {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
          setIsModalVisible(false);
        }
      };

      document.addEventListener('keydown', handleEscKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKeyDown);
      };
    } else return;
  }, [isModalVisible, setIsModalVisible, modalContentRef]);

  return !isModalVisible ? null : <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
    <div ref={modalContentRef} className="relative bg-gray-100 p-8 rounded-lg shadow-md w-full max-w-[92vw] sm:max-w-md">
      <button className="text-gray-700 absolute top-2 right-2 z-10" onClick={() => setIsModalVisible(false)} >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
          <path fillRule="evenodd" clipRule="evenodd" d="M10 9.293l5.146-5.147a.5.5 0 01.708.708L10.707 10l5.147 5.146a.5.5 0 01-.708.708L10 10.707l-5.146 5.147a.5.5 0 01-.708-.708L9.293 10 4.146 4.854a.5.5 0 11.708-.708L10 9.293z" />
        </svg>
      </button>
      {children}
    </div>
  </div>;
};
