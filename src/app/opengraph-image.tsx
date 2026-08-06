import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Branded card shown when the site is shared (iMessage, Slack, social, etc.).
// Next auto-wires this into og:image + twitter:image for the whole app.
export const runtime = "nodejs";
export const alt =
  "Kindling — the operating platform behind a modern note experience";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Embed the real logo so the share card matches the site exactly.
const logoData = readFileSync(join(process.cwd(), "public/logo.png"));
const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FBF9F7",
          padding: "80px",
        }}
      >
        {/* next/image can't run inside ImageResponse — a plain img is required. */}
        <img
          src={logoSrc}
          width={620}
          height={266}
          alt="Kindling"
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            marginTop: 44,
            fontSize: 40,
            color: "#21242C",
            textAlign: "center",
            maxWidth: 920,
            lineHeight: 1.3,
          }}
        >
          The operating platform behind a modern note experience
        </div>
        <div
          style={{
            marginTop: 40,
            height: 6,
            width: 120,
            backgroundColor: "#EF6939",
            borderRadius: 3,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
