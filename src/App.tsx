import {Box, Grid} from "@mui/joy";
import {useEffect, useState} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import LoginPage from "./pages/LoginPage.tsx";
import {
    BASE_URL_STORAGE_KEY,
    getValueFromStorage, PASSWORD_STORAGE_KEY,
    PAT_STORAGE_KEY,
    URL_PREFIX_STORAGE_KEY, USER_DATA_STORAGE_KEY,
    USERNAME_STORAGE_KEY
} from "./constants.ts";
import {Toaster} from "react-hot-toast";
import {callBackend} from "./Utils.ts";
import {DEFAULT_USER_DATA, UserData} from "./interfaces.ts";
import TaskPage from "./pages/TaskPage.tsx";

function App() {
    const [baseUrl, _setBaseUrl] = useState(getValueFromStorage(BASE_URL_STORAGE_KEY, ""));
    const [urlPrefix, _setUrlPrefix] = useState(getValueFromStorage(URL_PREFIX_STORAGE_KEY, "https://"));
    const [pat, _setPat] = useState(getValueFromStorage(PAT_STORAGE_KEY, ""));
    const [password, _setPassword] = useState(getValueFromStorage(PASSWORD_STORAGE_KEY, ""));
    const [fullUrl, setFullUrl] = useState<URL>(new URL(urlPrefix + baseUrl));
    const [username, _setUsername] = useState(getValueFromStorage(USERNAME_STORAGE_KEY, ""));

    const [userData, _setUserData] = useState<UserData>(
        JSON.parse(getValueFromStorage(USER_DATA_STORAGE_KEY, JSON.stringify(DEFAULT_USER_DATA)))
    );

    function setUserData(data: UserData) {
        _setUserData(data);
        localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(data));
    }

    function setBaseUrl(baseUrl: string, urlPrefix: string) {
        let full = `${urlPrefix}${baseUrl}`;
        localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);
        localStorage.setItem(URL_PREFIX_STORAGE_KEY, urlPrefix);
        _setBaseUrl(baseUrl);
        _setUrlPrefix(urlPrefix);
        setFullUrl(new URL(full));
    }

    function setPassword(password: string) {
        localStorage.setItem(PASSWORD_STORAGE_KEY, password);
        _setPassword(password);
    }

    function setUsername(username: string) {
        localStorage.setItem(USERNAME_STORAGE_KEY, username);
        _setUsername(username);
    }

    async function connect() {
        try {
            let loginRes = await callBackend("login", {
                endpoint: fullUrl.toString(),
                username: username,
                password: password
            });
            if (loginRes.success) {
                let res = await callBackend("connect", {
                    endpoint: fullUrl.toString(),
                    username: username,
                });
                if (res.success) {
                    setUserData(res.data);
                    return;
                } else {
                    window.location.href = '/';
                }
            }
        } catch {
            console.log("Failed to connect to server");
            return;
        }
    }

    useEffect(() => {
        connect().then().catch();
    }, [username, pat, fullUrl]);

    const router = createBrowserRouter([
        {
            path: "/",
            element: <LoginPage
                baseUrl={baseUrl}
                setBaseUrl={setBaseUrl}
                urlPrefix={urlPrefix}
                password={password}
                setPassword={setPassword}
                uname={username}
                setUname={setUsername}
                connect={connect}
                userData={userData}
            />,
        },
        {
            path: "/tasks",
            element: <TaskPage
                userData={userData}
                setUserData={setUserData}
                setPassword={setPassword}
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
