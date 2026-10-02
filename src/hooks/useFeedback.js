import { createContext, useContext } from 'react';

export const FeedbackContext = createContext(null);

// Returns { toast(message, { tone, icon }), confirm({ title, message, confirmLabel, tone }) => Promise<boolean> }
export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return context;
};
