import { useToast } from './use-toast';

// Extended hook to include additional toast variants like warning
export function useToastExtended() {
  const toast = useToast();
  
  // Add the warning toast function
  const warning = (props: {
    title: string;
    description?: string;
  }) => {
    // Use the default variant but with some styling to make it look like a warning
    return toast.toast({
      ...props,
      variant: "default",
      className: "warning-toast", // CSS class to style it as a warning
    });
  };
  
  return {
    ...toast,
    warning,
  };
} 