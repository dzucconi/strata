const previous = document.getElementById("previous") as HTMLButtonElement;
const next = document.getElementById("next") as HTMLButtonElement;

const navigate = (button: HTMLButtonElement) => {
  const id = button.dataset.id;
  if (id) location.href = `/${id}`;
};

previous.addEventListener("click", () => navigate(previous));
next.addEventListener("click", () => navigate(next));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    location.href = "/";
  }
  if (event.key === "ArrowLeft" && previous.dataset.id) {
    event.preventDefault();
    navigate(previous);
  }
  if (event.key === "ArrowRight" && next.dataset.id) {
    event.preventDefault();
    navigate(next);
  }
});
