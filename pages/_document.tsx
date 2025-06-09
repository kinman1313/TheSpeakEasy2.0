import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <meta name="theme-color" content="#000000" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon.svg" />
                <link rel="manifest" href="/manifest.json" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
} 