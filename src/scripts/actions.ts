const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

export const bindEntryActions = (root: ParentNode = document) => {
  const button = root.querySelector<HTMLButtonElement>(".Entry__more");
  const picker = root.querySelector<HTMLSelectElement>(".Entry__picker");
  if (!button || !picker) return;

  const reset = () => {
    picker.value = "";
  };

  button.addEventListener("click", () => {
    reset();

    if (typeof picker.showPicker === "function") {
      try {
        picker.showPicker();
        return;
      } catch {
        // Fall through to focusing the native control.
      }
    }

    picker.focus();
  });

  picker.addEventListener("change", async () => {
    const action = picker.value;
    reset();

    if (action === "copy") {
      try {
        await copyText(picker.dataset.copy ?? "");
      } catch {
        // Clipboard can be blocked in some embedded browsers.
      }
      return;
    }

    if (action === "find") {
      const url = picker.dataset.find;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  });
};
