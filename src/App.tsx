import {Box, Grid} from "@mui/joy";
import {useState} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import LoginPage from "./pages/LoginPage.tsx";
import {
    BASE_URL_STORAGE_KEY, DEFAULT_SETTINGS,
    getValueFromStorage, SETTINGS_STORAGE_KEY,
    URL_PREFIX_STORAGE_KEY,
} from "./constants.ts";
import toast, {Toaster} from "react-hot-toast";
import {callBackend} from "./Utils.ts";
import TaskPage from "./pages/TaskPage.tsx";
import {Settings} from "./interfaces.ts";

function App() {
    const [baseUrl, _setBaseUrl] = useState(getValueFromStorage(BASE_URL_STORAGE_KEY, ""));
    const [urlPrefix, _setUrlPrefix] = useState(getValueFromStorage(URL_PREFIX_STORAGE_KEY, "https://"));
    const [fullUrl, setFullUrl] = useState<URL>(new URL(urlPrefix + baseUrl));
    const [settings, _setSettings] = useState<Settings>(
        JSON.parse(getValueFromStorage(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS)))
    );

    function setBaseUrl(baseUrl: string, urlPrefix: string) {
        let full = `${urlPrefix}${baseUrl}`;
        localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);
        localStorage.setItem(URL_PREFIX_STORAGE_KEY, urlPrefix);
        _setBaseUrl(baseUrl);
        _setUrlPrefix(urlPrefix);
        setFullUrl(new URL(full));
    }

    function setSettings(newSettings: Settings) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        _setSettings(newSettings);
    }

    async function connect(username: string, password: string) {
        try {
            let loginRes = await callBackend("login", {
                endpoint: fullUrl.toString(),
                username: username,
                password: password
            });
            if (loginRes.success) {
                console.log("success");
                window.location.href = "/tasks";
            } else {
                window.location.href = '/';
            }
        } catch {
            toast.error("Failed to connect to server");
        }
    }

    const router = createBrowserRouter([
        {
            path: "/",
            element: <LoginPage
                baseUrl={baseUrl}
                setBaseUrl={setBaseUrl}
                urlPrefix={urlPrefix}
                connect={connect}
            />,
        },
        {
            path: "/tasks",
            element: <TaskPage
                settings={settings}
                setSettings={setSettings}
            />
        }
    ]);

    return (
        <Box sx={{overflow: 'hidden', userSelect: 'none'}}>
            <Toaster/>
            <Grid
                container
                spacing={0}
                direction="column"
                alignItems="center"
                justifyContent="center"
                sx={{position: 'absolute'}}
                style={{minHeight: '100vh', left: 0, top: 0, width: '100vw'}}
            >
                <Grid xs={10}>
                    <Box sx={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
                        <RouterProvider router={router}/>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}

export default App;
