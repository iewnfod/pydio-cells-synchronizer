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

export default function LoginPage({
    baseUrl,
    password,
    setBaseUrl,
    setPassword,
    urlPrefix,
    uname,
    setUname,
    connect,
} : {
    baseUrl: string,
    password: string,
    setBaseUrl: (baseUrl: string, urlPrefix: string) => void,
    setPassword: (password: string) => void,
    urlPrefix: string,
    uname: string,
    setUname: (username: string) => void,
    connect: () => Promise<void>,
}) {
    const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
    const [localUrlPrefix, setLocalUrlPrefix] = useState(urlPrefix);
    const [localPassword, setLocalPassword] = useState(password);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState(uname);

    useEffect(() => {
        if (localBaseUrl && username && localPassword) {
            handleLogin();
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
        if (localPassword.length === 0) {
            toast.error('Password should not be empty');
            return;
        }

        setLoading(true);
        setBaseUrl(localBaseUrl, localUrlPrefix);
        setPassword(localPassword);
        setUname(username);
        connect().then(() => {
            setLoading(false);
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
                        value={localPassword}
                        placeholder="Password"
                        type="password"
                        onChange={(e) => setLocalPassword(e.target.value.trim())}
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
