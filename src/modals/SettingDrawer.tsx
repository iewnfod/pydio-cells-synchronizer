import {
    Box,
    Button,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer, FormControl, FormLabel,
    IconButton,
    ModalClose,
    Sheet,
    Stack, Switch, Typography
} from "@mui/joy";
import SettingsIcon from "@mui/icons-material/Settings";
import {useState} from "react";
import {DEFAULT_SETTINGS, PAD, PAD2} from "../constants.ts";
import {Settings} from "../interfaces.ts";
import IgnoresInput from "../components/IgnoresInput.tsx";

const generalControls = [
    {
        label: 'Start with login',
        property:'startWithLogin',
    },
    {
        label: 'Show tray icon',
        property:'showTrayIcon',
    },
    {
        label: 'Upload when using battery',
        property: 'continueWhenUsingBattery',
    },
    {
        label: 'Notify you when upload failed',
        property: 'notificationWhenFailed',
    },
];

export default function SettingDrawerWithIconButton({
    settings,
    setSettings
} : {
    settings: Settings;
    setSettings: (newSettings: Settings) => void;
}) {
    const [open, setOpen] = useState(false);
    const [localSettings, setLocalSettings] = useState<Settings>(settings);

    function handleConfirm() {
        setSettings(localSettings);
        setOpen(false);
    }

    function handleReset() {
        setSettings(DEFAULT_SETTINGS);
        setOpen(false);
    }

    function setGlobalIgnores(ignores: string[]) {
        let newSettings = JSON.parse(JSON.stringify(localSettings));
        newSettings.globalIgnores = ignores;
        setLocalSettings(newSettings);
    }

    return (
        <>
            <IconButton onClick={() => {
                setLocalSettings(settings);
                setOpen(true);
            }}>
                <SettingsIcon/>
            </IconButton>

            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                size="lg"
                variant="plain"
                slotProps={{
                    content: {
                        sx: {
                            bgcolor: 'transparent',
                            p: { md: PAD2, sm: 0 },
                            boxShadow: 'none',
                        },
                    },
                }}
            >
                <Sheet
                    sx={{
                        borderRadius: 'md',
                        p: PAD2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: PAD2,
                        height: '100%',
                        overflow: 'auto',
                        justifyContent: 'flex-start'
                    }}
                >
                    <DialogTitle>Settings</DialogTitle>
                    <ModalClose />
                    <Divider sx={{ mt: 'auto' }} />
                    <DialogContent sx={{ gap: PAD2 }}>
                        <Box sx={{display: 'flex', flexDirection: 'column', gap: PAD }}>
                            <Typography level="title-md" sx={{ fontWeight: 'bold' }}>
                                General
                            </Typography>
                            {
                                generalControls.map((control, i) => (
                                    <FormControl orientation="horizontal" key={i}>
                                        <Box sx={{ flex: 1, pr: PAD }}>
                                            <FormLabel sx={{ typography: 'title-sm' }}>
                                                {control.label}
                                            </FormLabel>
                                        </Box>
                                        <Switch checked={
                                            //@ts-ignore
                                            localSettings[control.property]
                                        } onChange={(event) => {
                                            let newSettings = JSON.parse(JSON.stringify(localSettings));
                                            newSettings[control.property] = event.target.checked;
                                            setLocalSettings(newSettings);
                                        }}/>
                                    </FormControl>
                                ))
                            }
                        </Box>

                        <Divider/>

                        <Box sx={{display: 'flex', flexDirection: 'column', gap: PAD }}>
                            <Typography level="title-md" sx={{ fontWeight: 'bold' }}>
                                Global Ignores
                            </Typography>
                            <IgnoresInput ignores={localSettings.globalIgnores} setIgnores={setGlobalIgnores}/>
                        </Box>
                    </DialogContent>

                    <Divider sx={{ mt: 'auto' }} />

                    <Stack
                        direction="row"
                        useFlexGap
                        spacing={1}
                        sx={{ justifyContent: 'space-between' }}
                    >
                        <Button
                            variant="outlined"
                            color="neutral"
                            onClick={() => handleReset()}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="solid"
                            color="primary"
                            onClick={() => handleConfirm()}
                        >
                            Confirm
                        </Button>
                    </Stack>
                </Sheet>
            </Drawer>
        </>
    );
}
