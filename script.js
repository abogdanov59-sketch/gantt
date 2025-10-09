(function () {
  const items = document.querySelectorAll('.panel-list__item');
  items.forEach((item) => {
    item.addEventListener('mouseenter', () => item.classList.add('is-hovered'));
    item.addEventListener('mouseleave', () => item.classList.remove('is-hovered'));
    item.addEventListener('click', () => {
      items.forEach((el) => el.classList.remove('is-active'));
      item.classList.add('is-active');
    });
  });
})();
