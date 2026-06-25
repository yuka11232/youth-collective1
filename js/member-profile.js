const memberProfiles = {
  // Add the next member with a new URL key, then link to member.html?id=that-key.
  "human-centered-technology": {
    name: "Youssef El Haroun",
    title: "Youth Anthropology and Human-Centered Technology Ambassador",
    lead: "Building technology that begins with culture, identity, and real human experience.",
    image: "assets/images/Team%20members/Image1.jpeg",
    imageAlt: "Youth Collective member portrait",
    description: [
      "As a Youth Anthropology and Human-Centered Technology Ambassador, I focus on the relationship between people, culture, and innovation. I believe that technology becomes more meaningful when it begins with an understanding of how individuals live, communicate, preserve traditions, and experience the world around them.",
      "Growing up at the intersection of American, Azerbaijani, and Egyptian cultures has shaped the way I approach both people and ideas. Being exposed to different languages, customs, values, and social environments taught me to listen carefully, adapt to unfamiliar perspectives, and recognize that the same challenge may be understood differently across communities.",
      "Through my role in Youth Collective, I aim to encourage young people to approach engineering and technology with curiosity, empathy, and cultural awareness. My goal is to help build a community in which technical creativity is guided by real human experiences and where cultural differences are treated not as barriers, but as sources of insight, collaboration, and innovation."
    ]
  }
};

const params = new URLSearchParams(window.location.search);
const memberId = params.get("id") || "human-centered-technology";
const profile = memberProfiles[memberId];
const page = document.querySelector("[data-member-profile]");
const copyButton = document.querySelector("[data-copy-profile-link]");

if (!profile) {
  document.title = "Profile Not Found | Youth Collective";
  page.innerHTML = `
    <a class="back-link" href="team.html"><span aria-hidden="true">&lt;-</span> Back to Team</a>
    <div class="profile-empty">
      <p class="eyebrow">Member profile</p>
      <h1>Profile not found.</h1>
      <p>This member link does not match a published Youth Collective profile yet.</p>
    </div>
  `;
} else {
  document.title = `${profile.name} | Youth Collective`;
  document.querySelector("[data-member-name]").textContent = profile.name;
  document.querySelector("[data-member-title]").textContent = profile.title;
  document.querySelector("[data-member-lead]").textContent = profile.lead;

  const photo = document.querySelector("[data-member-photo]");
  photo.src = profile.image;
  photo.alt = profile.imageAlt;

  const body = document.querySelector("[data-member-body]");
  body.innerHTML = "";
  profile.description.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    body.appendChild(p);
  });
}

copyButton?.addEventListener("click", async () => {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.set("id", memberId);

  try {
    await navigator.clipboard.writeText(cleanUrl.href);
    copyButton.textContent = "Link copied";
  } catch {
    copyButton.textContent = cleanUrl.href;
  }

  window.setTimeout(() => {
    copyButton.textContent = "Copy profile link";
  }, 2200);
});
