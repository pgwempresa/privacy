// Renders the OnlyFans horizontal brand into every logo mount.
window.ONLYFANS_LOGO_HTML = '<img class="logo-img" src="/onlyfans-logo.png" alt="OnlyFans" width="126" height="28">';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.logo-mount').forEach(el => {
    el.innerHTML = window.ONLYFANS_LOGO_HTML;
  });
});
