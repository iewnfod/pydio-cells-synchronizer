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
import {getPassword, getUsername} from "../Utils.ts";

export default function LoginPage({
    baseUrl,
    setBaseUrl,
    urlPrefix,
    connect,
} : {
    baseUrl: string,
    setBaseUrl: (baseUrl: string, urlPrefix: string) => void,
    urlPrefix: string,
    connect: (username: string, password: string) => Promise<void>,
}) {
    const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
    const [localUrlPrefix, setLocalUrlPrefix] = useState(urlPrefix);
    const [localPassword, setLocalPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState("");

    useEffect(() => {
        let e = async () => {
            let uname = await getUsername();
            let pd = await getPassword();
            // @ts-ignore
            setUsername(uname);
            // @ts-ignore
            setLocalPassword(pd);

            if (localBaseUrl && uname && pd) {
                // @ts-ignore
                handleLogin(uname, pd);
            }
        };
        e().then();
    }, []);

    function handleLogin(name?: string, passwd?: string) {
        let uname = name || username;
        let pd = passwd || localPassword;
        if (localBaseUrl.length === 0) {
            toast.error('Base url should not be empty');
            return;
        }
        if (uname.length === 0) {
            toast.error('Username should not be empty');
            return;
        }
        if (pd.length === 0) {
            toast.error('Password should not be empty');
            return;
        }

        setLoading(true);
        setBaseUrl(localBaseUrl, localUrlPrefix);
        connect(uname, pd).then(() => {
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
