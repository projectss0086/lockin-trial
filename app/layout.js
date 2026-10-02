import "./globals.css";

export const metadata = {
  title: "자물쇠 피드백",
  description: "질문에 답만 하면, 학부모 피드백이 완성됩니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
