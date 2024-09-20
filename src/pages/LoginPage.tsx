import {
    AspectRatio,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardOverflow,
    Divider,
    Input, Option, Select,
    Typography
} from "@mui/joy";
import React, {useEffect, useState} from "react";
import {ASPECT_RATIO, BG_URL, PAD2, PAD3, SMALL_PART} from "../constants.ts";
import toast from "react-hot-toast";
import {UserData} from "../interfaces.ts";

export default function LoginPage({
    baseUrl,
    pat,
    setBaseUrl,
    setPat,
    urlPrefix,
    uname,
    setUname,
    connect,
    userData
} : {
    baseUrl: string,
    pat: string,
    setBaseUrl: (baseUrl: string, urlPrefix: string) => void,
    setPat: (pat: string) => void,
    urlPrefix: string,
    uname: string,
    setUname: (username: string) => void,
    connect: () => Promise<void>,
    userData: UserData
}) {
    const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
    const [localUrlPrefix, setLocalUrlPrefix] = useState(urlPrefix);
    const [localPat, setLocalPat] = useState(pat);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState(uname);

    useEffect(() => {
        if (userData !== undefined) {
            if (userData.Uuid.length > 0) {
                window.location.href = "/tasks";
            }
        }
    }, []);

    function handleLogin() {
        if (localBaseUrl.length === 0) {
            toast.error('Base url should not be empty');
            return;
        }
        if (username.length === 0) {
            toast.error('Username should not be empty');
            return;
        }
        if (localPat.length === 0) {
            toast.error('Personal Access Token should not be empty');
            return;
        }

        setLoading(true);
        setBaseUrl(localBaseUrl, localUrlPrefix);
        setPat(localPat);
        setUname(username);
        connect().then(() => {
            setLoading(false);
            setTimeout(() => {
                window.location.href = "/tasks";
            }, 100);
        }).catch(() => {
            setLoading(false);
        });
    }

    function handleSelectUrlPrefix(prefix: string) {
        setBaseUrl(localBaseUrl, prefix);
        setLocalUrlPrefix(prefix);
    }

    return (
        <Card variant="outlined" sx={{
            width: `${SMALL_PART}%`, minWidth: '25rem'
        }}>
            <CardOverflow>
                <AspectRatio ratio={ASPECT_RATIO}>
                    <img src={BG_URL} alt=""/>
                </AspectRatio>
            </CardOverflow>
            <CardContent sx={{p: PAD2, gap: PAD3}}>
                <Typography level="title-lg" sx={{textAlign: 'center'}}>
                    Login to Your Pydio Account
                </Typography>
                <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: PAD2}}>
                    <Input
                        value={localBaseUrl}
                        placeholder="demo.pydio.com"
                        type="url"
                        onChange={(e) => setLocalBaseUrl(e.target.value.trim())}
                        startDecorator={(
                            <React.Fragment>
                                <Select
                                    variant="plain"
                                    value={localUrlPrefix}
                                    onChange={(_, value) => handleSelectUrlPrefix(value!)}
                                    slotProps={{
                                        listbox: {
                                            variant: 'outlined',
                                        },
                                    }}
                                    sx={{ '&:hover': { bgcolor: 'transparent' } }}
                                >
                                    <Option value="https://">https://</Option>
                                    <Option value="http://">http://</Option>
                                </Select>
                                <Divider orientation="vertical" />
                            </React.Fragment>
                        )}
                    />
                    <Input
                        value={username}
                        placeholder="Username"
                        onChange={(e) => setUsername(e.target.value.trim())}
                    />
                    <Input
                        value={localPat}
                        placeholder="Personal Access Token"
                        type="password"
                        onChange={(e) => setLocalPat(e.target.value.trim())}
                    />
                </Box>
            </CardContent>
            <Divider/>
            <CardActions sx={{p: PAD2}}>
                <Button loading={loading} onClick={() => handleLogin()}>
                    Login
                </Button>
            </CardActions>
        </Card>
    );
}
