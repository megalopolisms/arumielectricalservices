/* ==========================================================================
   Arumi Electrical Services — Main JavaScript
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // --- Mobile Nav Toggle ---
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("active");
      toggle.classList.toggle("open");
    });
    // Close on link click
    links.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        links.classList.remove("active");
        toggle.classList.remove("open");
      });
    });
  }

  // --- Navbar scroll shadow ---
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 20);
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // --- Contact form (Formspree placeholder) ---
  const form = document.querySelector(".contact-form form");
  if (form) {
    form.addEventListener("submit", (e) => {
      // If no action URL yet, show placeholder message
      if (!form.action || form.action === "#") {
        e.preventDefault();
        alert("Thank you for your message! We will get back to you shortly.");
        form.reset();
      }
    });
  }
});
