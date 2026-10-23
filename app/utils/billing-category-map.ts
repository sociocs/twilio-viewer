import type { BillingCategoryConfig } from "~/types";

export const billingCategoryMap = new Map<string, BillingCategoryConfig>([
  // Voice
  ["agent-conference", { category_desc: "Count is the number of agent conferences and Usage is the number of minutes.", group: "Voice", level: 1, order: 100 }],
  ["answering-machine-detection", { category_desc: "All answering machine detection recognitions for outbound calls. Count is the number of recognitions.", group: "Voice", level: 1, order: 200 }],
  ["amazon-polly", { category_desc: "Speech generated with Polly voices.", group: "Voice", level: 1, order: 300 }],
  ["calls-text-to-speech", { category_desc: "Amazon Polly characters.", group: "Voice", level: 1, order: 350, ignore: true }],
  ["calls", { category_desc: "Inbound and outbound voice calls. Count is the number of calls and Usage is the number of minutes. Does not include client or SIP calls.", group: "Voice", level: 1, order: 400, ignore: true }],
  ["calls-inbound", { category_desc: "All inbound voice calls, to mobile, toll-free and local numbers.", group: "Voice", level: 1, order: 500 }],
  ["calls-inbound-local", { category_desc: "All inbound voice calls to local numbers.", group: "Voice", level: 2, order: 600, parentCategory: "calls-inbound" }],
  ["calls-inbound-mobile", { category_desc: "All inbound voice calls to mobile numbers.", group: "Voice", level: 2, order: 700, parentCategory: "calls-inbound" }],
  ["calls-inbound-tollfree", { category_desc: "All inbound voice calls to toll-free numbers.", group: "Voice", level: 2, order: 800, parentCategory: "calls-inbound" }],
  ["calls-outbound", { category_desc: "All outbound voice calls.", group: "Voice", level: 1, order: 900 }],
  ["calls-sip", { category_desc: "All SIP calls.", group: "Voice", level: 1, order: 1000 }],
  ["calls-sip-inbound", { category_desc: "All inbound SIP calls.", group: "Voice", level: 2, order: 1100, parentCategory: "calls-sip" }],
  ["calls-sip-outbound", { category_desc: "All outbound SIP calls.", group: "Voice", level: 2, order: 1200, parentCategory: "calls-sip" }],
  ["calls-client", { category_desc: "All TwilioClient voice calls.", group: "Voice", level: 1, order: 1300 }],
  ["calls-globalconference", { category_desc: "All global conference calls.", group: "Voice", level: 1, order: 1400 }],
  ["calls-media-stream-minutes", { category_desc: "All Media Stream calls", group: "Voice", level: 1, order: 1500 }],
  ["calls-pay-verb-transactions", { category_desc: "<Pay> verb transactions. Count is total number of <Pay> transactions", group: "Voice", level: 1, order: 1600 }],
  ["call-progess-events", { category_desc: "All call progress events.", group: "Voice", level: 1, order: 1700 }],
  ["programmablevoice-platform", { category_desc: "All Programmable Voice Platform usage in Flex Projects", group: "Voice", level: 1, order: 1900, ignore: true }],
  ["programmablevoiceconnectivity", { category_desc: "Inbound and outbound voice calls in Flex Projects. Count is the number of calls and Usage is the number of minutes. Includes Client and SIP Calls.", group: "Voice", level: 1, order: 2000, ignore: true }],
  ["programmablevoiceconn-sip", { category_desc: "All SIP Calls in Flex Projects", group: "Voice", level: 1, order: 2100 }],
  ["programmablevoiceconn-sip-inbound", { category_desc: "All Inbound SIP Calls in Flex Projects", group: "Voice", level: 2, order: 2200, parentCategory: "programmablevoiceconn-sip" }],
  ["programmablevoiceconn-sip-outbound", { category_desc: "All Outbound SIP Calls in Flex Projects", group: "Voice", level: 2, order: 2300, parentCategory: "programmablevoiceconn-sip" }],
  ["programmablevoiceconn-clientsdk", { category_desc: "All TwilioClient voice calls in Flex Projects", group: "Voice", level: 1, order: 2400 }],
  ["programmablevoiceconn-clientsdk-inbound", { category_desc: "All TwilioClient voice calls in Flex Projects", group: "Voice", level: 2, order: 2410, parentCategory: "programmablevoiceconn-clientsdk" }],
  ["programmablevoiceconn-clientsdk-outbound", { category_desc: "All TwilioClient voice calls in Flex Projects", group: "Voice", level: 2, order: 2420, parentCategory: "programmablevoiceconn-clientsdk" }],
  ["pstnconnectivity", { category_desc: "Inbound and outbound voice calls in Flex Projects. Count is the number of calls and Usage is the number of minutes.", group: "Voice", level: 1, order: 2500 }],
  ["pstnconnectivity-inbound", { category_desc: "All inbound voice calls, to mobile, toll-free and local numbers in Flex Projects", group: "Voice", level: 2, order: 2600, parentCategory: "pstnconnectivity" }],
  ["pstnconnectivity-outbound", { category_desc: "All outbound voice calls in Flex Projects", group: "Voice", level: 2, order: 2700, parentCategory: "pstnconnectivity" }],
  ["recordings", { category_desc: "Recordings of voice and trunking calls. Count is the number of recordings and Usage is the number of recorded minutes.", group: "Voice", level: 1, order: 2800 }],
  ["calls-recordings", { category_desc: "Recordings of voice calls. Count is the number of recordings and Usage is the number of recorded minutes.", group: "Voice", level: 2, order: 2850, parentCategory: "recordings" }],
  ["recordingstorage", { category_desc: "Amount of storage used by call recordings stored for the account. Count is the number of stored recordings, Usage is the number of stored recorded minutes, and Price is the price of storing the recordings.", group: "Voice", level: 1, order: 2900 }],
  ["speech-recognition", { category_desc: "Speech recognitions in calls. Count is total number of calls where speech recognition was performed and usage is total number of recognitions", group: "Voice", level: 1, order: 3000 }],
  ["transcriptions", { category_desc: "Transcriptions of voice calls. Count is the number of transcriptions and Usage is the number of transcribed minutes.", group: "Voice", level: 1, order: 3100 }],
  ["virtual-agent", { category_desc: "Virtual Agent usage in calls. Count is the number of <VirtualAgent> invocations and Usage is the number of minutes.", group: "Voice", level: 1, order: 3200 }],
  ["voice-insights", { category_desc: "Voice Insights Advanced Features", group: "Voice", level: 1, order: 3300 }],
  ["voice-insights-ptsn-insights-on-demand-minute", { category_desc: "Voice Insights Advanced Features for Programmable Voice calls", group: "Voice", level: 2, order: 3400, parentCategory: "voice-insights" }],
  ["voice-insights-sip-trunking-insights-on-demand-minute", { category_desc: "Voice Insights Advanced Features for trunking calls", group: "Elastic SIP Trunking", level: 1, order: 3500 }],

  // SMS & MMS
  ["a2p-registration-fees", { category_desc: "All Messaging A2P Registration Fees", group: "SMS & MMS", level: 1, order: 3600 }],
  ["a2p-10dlc-registrationfees-campaigncharges", { category_desc: "A2P 10DLC Campaign Registration vetting and renewal charges.", group: "SMS & MMS", level: 2, order: 3610, parentCategory: "a2p-registration-fees" }],
  ["a2p-10dlc-registrationfees-monthly", { category_desc: "A2P 10DLC monthly campaign maintenance fees charged by mobile carriers.", group: "SMS & MMS", level: 2, order: 3620, parentCategory: "a2p-registration-fees" }],
  ["a2p-10dlc-registrationfees-brand", { category_desc: "A2P 10DLC Brand Registration one-time vetting fees.", group: "SMS & MMS", level: 2, order: 3630, parentCategory: "a2p-registration-fees" }],
  ["a2p-10dlc-registrationfees-onetime", { category_desc: "All Messaging A2P Registration One-Time Fees", group: "SMS & MMS", level: 2, order: 3640, parentCategory: "a2p-registration-fees" }],
  ["a2p-10dlc-registrationfees-brandregistration", { category_desc: "All Messaging A2P Registration Brand Fees", group: "SMS & MMS", level: 2, order: 3645, parentCategory: "a2p-registration-fees" }],
  ["a2p-10dlc-registrationfees-campaignvetting", { category_desc: "All Messaging A2P Registration Campaign Fees", group: "SMS & MMS", level: 2, order: 3650, parentCategory: "a2p-registration-fees" }],
  ["channels", { category_desc: "All messages.", group: "SMS & MMS", level: 1, order: 3650, ignore: true }],
  ["bundle-sms-bucket", { category_desc: "All US SMS messages, both inbound and outbound.", group: "SMS & MMS", level: 1, order: 3675, ignore: true }],
  ["sms", { category_desc: "All SMS messages, both inbound and outbound. Count and Usage are both the number of messages sent.", group: "SMS & MMS", level: 1, order: 3700, ignore: true }],
  ["sms-inbound", { category_desc: "All inbound SMS messages, to both short-codes and long-codes.", group: "SMS & MMS", level: 1, order: 3800 }],
  ["sms-inbound-longcode", { category_desc: "All inbound SMS messages to long-codes.", group: "SMS & MMS", level: 2, order: 3900, parentCategory: "sms-inbound" }],
  ["sms-inbound-tollfree", { category_desc: "All inbound SMS messages to toll-free numbers.", group: "SMS & MMS", level: 2, order: 3950, parentCategory: "sms-inbound" }],
  ["sms-inbound-shortcode", { category_desc: "All inbound SMS messages to short-codes.", group: "SMS & MMS", level: 2, order: 4000, parentCategory: "sms-inbound" }],
  ["sms-outbound", { category_desc: "All outbound SMS messages, from both short-codes and long-codes.", group: "SMS & MMS", level: 1, order: 4100 }],
  ["sms-outbound-longcode", { category_desc: "All outbound SMS messages from long-codes.", group: "SMS & MMS", level: 2, order: 4200, parentCategory: "sms-outbound" }],
  ["sms-outbound-tollfree", { category_desc: "All outbound SMS messages from toll-free numbers.", group: "SMS & MMS", level: 2, order: 4250, parentCategory: "sms-outbound" }],
  ["sms-outbound-shortcode", { category_desc: "All outbound SMS messages from short-codes.", group: "SMS & MMS", level: 2, order: 4300, parentCategory: "sms-outbound" }],
  ["sms-messages-carrierfees", { category_desc: "All carrier network pass-through surcharges for SMS messages.", group: "SMS & MMS", level: 1, order: 4400 }],
  ["sms-pumping-protection", { category_desc: "SMS Pumping Risk Check fees for traffic monitoring and fraud mitigation.", group: "SMS & MMS", level: 1, order: 4420 }],
  ["experiment-france-sms", { category_desc: "France SMS destination traffic fees.", group: "SMS & MMS", level: 2, order: 4210, parentCategory: "sms-outbound" }],
  ["experiment-india-sms", { category_desc: "India SMS destination traffic fees.", group: "SMS & MMS", level: 2, order: 4220, parentCategory: "sms-outbound" }],
  ["failed-message-processing-fee", { category_desc: "Carrier processing fees for undelivered or failed messages.", group: "SMS & MMS", level: 1, order: 4430 }],
  ["mms", { category_desc: "All MMS messages, both inbound and outbound. Count and Usage are both the number of messages sent.", group: "SMS & MMS", level: 1, order: 4500, ignore: true }],
  ["mms-inbound", { category_desc: "All inbound MMS messages, to both short-codes and long-codes.", group: "SMS & MMS", level: 1, order: 4600 }],
  ["mms-inbound-longcode", { category_desc: "All inbound MMS messages to long-codes.", group: "SMS & MMS", level: 2, order: 4700, parentCategory: "mms-inbound" }],
  ["mms-inbound-toll-free", { category_desc: "All inbound MMS messages to toll-free numbers.", group: "SMS & MMS", level: 2, order: 4750, parentCategory: "mms-inbound" }],
  ["mms-inbound-shortcode", { category_desc: "All inbound MMS messages to short-codes.", group: "SMS & MMS", level: 2, order: 4800, parentCategory: "mms-inbound" }],
  ["mms-outbound", { category_desc: "All outbound MMS messages, from both short-codes and long-codes.", group: "SMS & MMS", level: 1, order: 4900 }],
  ["mms-outbound-longcode", { category_desc: "All outbound MMS messages from long-codes.", group: "SMS & MMS", level: 2, order: 5000, parentCategory: "mms-outbound" }],
  ["mms-outbound-tollfree", { category_desc: "All outbound MMS messages from toll-free numbers.", group: "SMS & MMS", level: 2, order: 5050, parentCategory: "mms-outbound" }],
  ["mms-outbound-shortcode", { category_desc: "All outbound MMS messages from short-codes.", group: "SMS & MMS", level: 2, order: 5100, parentCategory: "mms-outbound" }],
  ["mms-messages-carrierfees", { category_desc: "All carrier fees for MMS messages.", group: "SMS & MMS", level: 1, order: 5200 }],
  ["mediastorage", { category_desc: "Amount of storage used by media stored for the account. Count is the number of stored media files, Usage is the number of megabytes, and Price is the price of storing the media.", group: "SMS & MMS", level: 1, order: 5300 }],

  // WhatsApp Business API
  ["channels-whatsapp", { category_desc: "WhatsApp Conversations Fees.", group: "WhatsApp Business API", level: 1, order: 5350 }],
  ["channels-whatsapp-outbound", { category_desc: "WhatsApp Outbound Conversation Fees.", group: "WhatsApp Business API", level: 2, order: 5400, parentCategory: "channels-whatsapp" }],
  ["channels-whatsapp-inbound", { category_desc: "WhatsApp does not charge for inbound messages. User-initiated conversation fees are charged on first response.", group: "WhatsApp Business API", level: 2, order: 5405, parentCategory: "channels-whatsapp" }],
  ["channels-whatsapp-template-marketing", { category_desc: "WhatsApp Marketing conversation charges (business-initiated promotions, offers, announcements).", group: "WhatsApp Business API", level: 2, order: 5410, parentCategory: "channels-whatsapp" }],
  ["channels-whatsapp-template-utility", { category_desc: "WhatsApp Utility conversation charges (order updates, account alerts, receipts).", group: "WhatsApp Business API", level: 2, order: 5420, parentCategory: "channels-whatsapp" }],
  ["channels-whatsapp-template-authentication", { category_desc: "WhatsApp Authentication conversation charges (one-time passcodes, login verifications).", group: "WhatsApp Business API", level: 2, order: 5430, parentCategory: "channels-whatsapp" }],
  ["channels-whatsapp-template-service", { category_desc: "WhatsApp Service conversation charges (user-initiated customer support conversations).", group: "WhatsApp Business API", level: 2, order: 5440, parentCategory: "channels-whatsapp" }],
  ["channels-whatsapp-conversation-free", { category_desc: "WhatsApp free-tier service conversations.", group: "WhatsApp Business API", level: 2, order: 5450, parentCategory: "channels-whatsapp" }],
  ["channels-messaging", { category_desc: "Twilio charges a flat-rate per inbound & outbound message platform fee for any and all countries.", group: "WhatsApp Business API", level: 1, order: 5550 }],
  ["channels-messaging-inbound", { category_desc: "Twilio flat-rate per inbound message platform fee.", group: "WhatsApp Business API", level: 2, order: 5600, parentCategory: "channels-messaging" }],
  ["channels-messaging-outbound", { category_desc: "Twilio flat-rate per outbound message platform fee.", group: "WhatsApp Business API", level: 2, order: 5700, parentCategory: "channels-messaging" }],

  // Programmable Chat
  ["pchat-users", { category_desc: "Active Monthly Users - An active user is defined as someone who creates a user or conversation, or edits, or is assigned to a chat channel.", group: "Programmable Chat", level: 1, order: 5800 }],
  ["pchat-conv-med-storage", { category_desc: "Media Storage - Photos, videos, or other files stored and distributed in chat channels are billed at a monthly rate according to their size, prorated daily.", group: "Programmable Chat", level: 1, order: 5900 }],

  // Phone Numbers
  ["phonenumbers", { category_desc: "All phone numbers owned by the account, mobile, toll-free and local.", group: "Phone Numbers", level: 1, order: 6000, ignore: true }],
  ["phonenumbers-local", { category_desc: "All local phone numbers owned by the account.", group: "Phone Numbers", level: 1, order: 6100 }],
  ["phone-numbers-local", { category_desc: "All local phone numbers owned by the account.", group: "Phone Numbers", level: 1, order: 6100 }],
  ["phonenumbers-mobile", { category_desc: "All mobile phone numbers owned by the account.", group: "Phone Numbers", level: 1, order: 6200 }],
  ["phone-numbers-mobile", { category_desc: "All mobile phone numbers owned by the account.", group: "Phone Numbers", level: 1, order: 6200 }],
  ["phonenumbers-tollfree", { category_desc: "All toll-free phone numbers owned by the account.", group: "Phone Numbers", level: 1, order: 6300 }],
  ["phone-numbers-tollfree", { category_desc: "All toll-free phone numbers owned by the account.", group: "Phone Numbers", level: 1, order: 6300 }],
  ["phonenumbers-cps", { category_desc: "All phone number call per second (CPS) increases.", group: "Phone Numbers", level: 1, order: 6400 }],
  ["phone-numbers-cps", { category_desc: "All phone number call per second (CPS) increases.", group: "Phone Numbers", level: 1, order: 6400 }],
  ["phonenumbers-setups", { category_desc: "All phone number setups fees.", group: "Phone Numbers", level: 1, order: 6500 }],
  ["phone-numbers-setups", { category_desc: "All phone number setups fees.", group: "Phone Numbers", level: 1, order: 6500 }],
  ["shortcodes", { category_desc: "All ShortCodes owned by the account, of all types.", group: "Phone Numbers", level: 1, order: 6600, ignore: true }],
  ["shortcodes-customerowned", { category_desc: "All ShortCodes owned by the account that are leased from another provider.", group: "Phone Numbers", level: 1, order: 6700 }],
  ["shortcodes-mms-enablement", { category_desc: "All Short Code MMS enablement fees.", group: "Phone Numbers", level: 1, order: 6800 }],
  ["shortcodes-mps", { category_desc: "All Short Code message per second (MPS) increases.", group: "Phone Numbers", level: 1, order: 6900 }],
  ["shortcodes-random", { category_desc: "All randomly-assigned ShortCodes owned by the account.", group: "Phone Numbers", level: 1, order: 7000 }],
  ["shortcodes-uk", { category_desc: "All UK ShortCodes owned by the account.", group: "Phone Numbers", level: 1, order: 7100 }],
  ["shortcodes-vanity", { category_desc: "All vanity ShortCodes owned by the account.", group: "Phone Numbers", level: 1, order: 7200 }],

  // Lookup
  ["lookups", { category_desc: "All Lookups executed across all categories", group: "Lookup", level: 1, order: 7300, ignore: true }],
  ["carrier-lookups", { category_desc: "All Carrier lookups", group: "Lookup", level: 1, order: 7400 }],
  ["calleridlookups", { category_desc: "All Caller Name lookups", group: "Lookup", level: 1, order: 7500 }],
  ["number-format-lookups", { category_desc: "All Number Formatting lookups", group: "Lookup", level: 1, order: 7600 }],
  ["call-forwarding-lookups", { category_desc: "All Call Forwarding lookups", group: "Lookup", level: 1, order: 7700 }],
  ["sim-swap-lookups", { category_desc: "All SIM Swap lookups", group: "Lookup", level: 1, order: 7800 }],
  ["live-activity-lookups", { category_desc: "All Live Activity lookups", group: "Lookup", level: 1, order: 7900 }],
  ["enhanced-line-type-lookups", { category_desc: "All Line Type Intelligence lookups", group: "Lookup", level: 1, order: 8000 }],
  ["identity-match", { category_desc: "All Identity Match lookups", group: "Lookup", level: 1, order: 8100 }],

  // Elastic SIP Trunking
  ["trunking-origination", { category_desc: "All trunking origination (inbound) calls, to mobile, toll-free and local numbers.", group: "Elastic SIP Trunking", level: 1, order: 8200 }],
  ["trunking-origination-local", { category_desc: "All trunking origination (inbound) calls to local numbers.", group: "Elastic SIP Trunking", level: 2, order: 8300, parentCategory: "trunking-origination" }],
  ["trunking-origination-mobile", { category_desc: "All trunking origination (inbound) calls to mobile numbers.", group: "Elastic SIP Trunking", level: 2, order: 8400, parentCategory: "trunking-origination" }],
  ["trunking-origination-tollfree", { category_desc: "All trunking origination (inbound) calls to toll-free numbers.", group: "Elastic SIP Trunking", level: 2, order: 8500, parentCategory: "trunking-origination" }],
  ["trunking-termination", { category_desc: "All trunking termination (outbound) calls.", group: "Elastic SIP Trunking", level: 1, order: 8600 }],
  ["trunking-recordings", { category_desc: "Recordings of trunking calls. Count is the number of recordings and Usage is the number of recorded minutes.", group: "Elastic SIP Trunking", level: 1, order: 8700 }],
  ["trunking-cps", { category_desc: "All trunking call per second (CPS) increases.", group: "Elastic SIP Trunking", level: 1, order: 8800 }],
  ["trunking-secure", { category_desc: "All secured trunking calls.", group: "Elastic SIP Trunking", level: 1, order: 8900 }],

  // Sync
  ["sync-actions", { category_desc: "All incoming requests from your application that read and write data.", group: "Sync", level: 1, order: 9000 }],
  ["sync-endpoint-hours", { category_desc: "An endpoint-hour is counted once per wall-clock hour for each unique device connected to Sync.", group: "Sync", level: 1, order: 9100 }],
  ["sync-endpoint-hours-above-daily-cap", { category_desc: "All hours spent above four hours limit are shown separately. All these hours are free of charge.", group: "Sync", level: 1, order: 9200 }],

  // Task Router
  ["taskrouter-tasks", { category_desc: "All tasks created in Task Router.", group: "Task Router", level: 1, order: 9300 }],

  // Programmable Video
  ["pv", { category_desc: "All Programmable Video usage including TURN. Price accounts for expenses in all Programmable Video products.", group: "Programmable Video", level: 1, order: 9400, ignore: true }],
  ["group-rooms", { category_desc: "Accounts for all Group Rooms usage. Count is the number of rooms.", group: "Programmable Video", level: 1, order: 9500 }],
  ["group-rooms-participant-minutes", { category_desc: "All participant usage in Group Rooms. Count and Usage measure the number of participant minutes.", group: "Programmable Video", level: 2, order: 9600, parentCategory: "group-rooms" }],
  ["group-rooms-data-track", { category_desc: "All Group Room Data Tracks activity. Count and Usage measure thousands of messages sent.", group: "Programmable Video", level: 2, order: 9700, parentCategory: "group-rooms" }],
  ["small-group-rooms", { category_desc: "Accounts for all Small Group Rooms usage. Count is the number of rooms.", group: "Programmable Video", level: 1, order: 9800 }],
  ["small-group-rooms-participant-minutes", { category_desc: "All participant usage in Small Group Rooms. Count and Usage measure the number of participant minutes.", group: "Programmable Video", level: 2, order: 9900, parentCategory: "small-group-rooms" }],
  ["small-group-rooms-data-track", { category_desc: "All Small Group Room Data Tracks activity. Count and Usage measure thousands of messages sent.", group: "Programmable Video", level: 2, order: 10000, parentCategory: "small-group-rooms" }],
  ["pv-rooms", { category_desc: "Accounts for all Peer-to-Peer Rooms usage. Count is the number of rooms. Usage is the number of participant minutes.", group: "Programmable Video", level: 1, order: 10100 }],
  ["peer-to-peer-rooms-participant-minutes", { category_desc: "All participant usage in P2P Rooms. Count and Usage measure the number of participant minutes.", group: "Programmable Video", level: 1, order: 10200 }],
  ["video-recordings", { category_desc: "All usage regarding video Recordings and Compositions.", group: "Programmable Video", level: 1, order: 10300 }],
  ["group-rooms-recorded-minutes", { category_desc: "All Recordings generated out of Group Rooms (including Small Group Rooms).", group: "Programmable Video", level: 1, order: 10400 }],
  ["pv-composition-minutes", { category_desc: "All Video Recording Compositions. Count and Usage measure the number of composition minutes.", group: "Programmable Video", level: 1, order: 10500 }],
  ["group-rooms-encrypted-media-recorded", { category_desc: "All encrypted media including Group Room Recordings and Compositions.", group: "Programmable Video", level: 1, order: 10600 }],
  ["group-rooms-media-stored", { category_desc: "All media stored in Twilio by Programmable Video Services including Recordings and Compositions.", group: "Programmable Video", level: 1, order: 10700 }],
  ["group-rooms-media-downloaded", { category_desc: "All media downloaded from Twilio regarding Programmable Video Services.", group: "Programmable Video", level: 1, order: 10800 }],
  ["turnmegabytes", { category_desc: "All TURN data relayed by Twilio. Count and Usage measure the relayed traffic in MB (Megabytes)", group: "Programmable Video", level: 1, order: 10900 }],
  ["turnmegabytes-australia", { category_desc: "TURN data relayed by Twilio in the Australia AWS region.", group: "Programmable Video", level: 2, order: 11000, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-brasil", { category_desc: "TURN data relayed by Twilio in the Brazil AWS region.", group: "Programmable Video", level: 2, order: 11100, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-india", { category_desc: "TURN data relayed by Twilio in the India AWS region.", group: "Programmable Video", level: 2, order: 11200, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-ireland", { category_desc: "TURN data relayed by Twilio in the Ireland AWS region.", group: "Programmable Video", level: 2, order: 11300, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-japan", { category_desc: "TURN data relayed by Twilio in the Japan AWS region.", group: "Programmable Video", level: 2, order: 11400, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-singapore", { category_desc: "TURN data relayed by Twilio in the Singapore AWS region.", group: "Programmable Video", level: 2, order: 11500, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-useast", { category_desc: "TURN data relayed by Twilio in the US (East) AWS region.", group: "Programmable Video", level: 2, order: 11600, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-uswest", { category_desc: "TURN data relayed by Twilio in the US (West) AWS region.", group: "Programmable Video", level: 2, order: 11700, parentCategory: "turnmegabytes" }],
  ["turnmegabytes-germany", { category_desc: "TURN data relayed by Twilio in the Germany AWS region.", group: "Programmable Video", level: 2, order: 11800, parentCategory: "turnmegabytes" }],

  // Verify
  ["verify-push", { category_desc: "All Verify push verifications.", group: "Verify", level: 1, order: 11900 }],
  ["verify-totp", { category_desc: "All Verify TOTP verifications.", group: "Verify", level: 1, order: 12000 }],
  ["verify-sna", { category_desc: "All Verify Silent Network Auth (SNA) verifications.", group: "Verify", level: 1, order: 12100 }],
  ["authy-phone-verifications", { category_desc: "All Verify SMS and Voice verifications.", group: "Verify", level: 1, order: 12200 }],
  ["authy-verify-email-verifications", { category_desc: "All Verify email verifications.", group: "Verify", level: 1, order: 12300 }],
  ["authy-verify-outbound-email", { category_desc: "All Verify one-time tokens requested to be delivered via email.", group: "Verify", level: 1, order: 12400 }],
  ["verify-whatsapp-conversations-business-initiated", { category_desc: "All WhatsApp business-initiated conversations associated with using Verify to send one-time-passcode messages to WhatsApp users.", group: "Verify", level: 1, order: 12500 }],

  // Authy
  ["authy-authentications", { category_desc: "All Authy authentications.", group: "Authy", level: 1, order: 12600 }],
  ["authy-calls-outbound", { category_desc: "All Authy outbound calls. Note that this usage is also included in the Voice categories.", group: "Authy", level: 2, order: 12700, parentCategory: "calls-outbound" }],
  ["authy-monthly-fees", { category_desc: "All Authy monthly fees.", group: "Authy", level: 1, order: 12800 }],
  ["authy-phone-intelligence", { category_desc: "All Authy phone intelligence requests.", group: "Authy", level: 1, order: 12900 }],
  ["authy-sms-outbound", { category_desc: "All Authy and Verify outbound SMS messages. Note that this usage is also included in the SMS categories.", group: "Authy", level: 2, order: 13000, parentCategory: "sms-outbound" }],
  ["authy-outbound-email", { category_desc: "All Authy one-time tokens requested to be delivered via email.", group: "Authy", level: 1, order: 13100 }],

  // Studio
  ["studio-engagements", { category_desc: "All Studio Engagements", group: "Studio", level: 1, order: 13200 }],

  // Monitor
  ["monitor-reads", { category_desc: "All Monitor events API reads.", group: "Monitor", level: 1, order: 13300 }],
  ["monitor-writes", { category_desc: "All Monitor events writes.", group: "Monitor", level: 1, order: 13400 }],
  ["monitor-storage", { category_desc: "All Monitor events storage fees.", group: "Monitor", level: 1, order: 13500 }],

  // Internet of Things
  ["wireless-orders-starter", { category_desc: "All Programmable Wireless Starter Packs ordered.", group: "Internet of Things", level: 1, order: 13600 }],
  ["wireless-orders-bulk", { category_desc: "All Programmable Wireless Bulk SIMs ordered.", group: "Internet of Things", level: 1, order: 13700 }],
  ["wireless-mrc-payg", { category_desc: "All Programmable Wireless Monthly Fees for SIMs using PAYG data metering.", group: "Internet of Things", level: 1, order: 13800 }],

  // Autopilot
  ["autopilot-messaging", { category_desc: "All Autopilot messages. Includes messages coming from Programmable Messaging, Programmable Chat and custom channels.", group: "Autopilot", level: 1, order: 13900 }],
  ["autopilot-voice", { category_desc: "All Autopilot voice minutes. Count is the number of minutes.", group: "Autopilot", level: 1, order: 14000 }],
  ["autopilot-other", { category_desc: "All Autopilot API Queries. Count is the number of queries.", group: "Autopilot", level: 1, order: 14100 }],
  ["autopilot-home-assistants", { category_desc: "All messages from Alexa or Google Assistant.", group: "Autopilot", level: 1, order: 14200 }],

  // Event Streams
  ["events", { category_desc: "All Event Streams events delivered. Usage is in thousands of events.", group: "Event Streams", level: 1, order: 14300 }],

  // Other / Summary
  ["premiumsupport", { category_desc: "All premium support fees.", group: "Other", level: 1, order: 14400 }],
  ["totalprice", { category_desc: "Total price of all usage.", group: "Other", level: 1, order: 14500, ignore: true }],
  ["total-price", { category_desc: "Total price of all usage.", group: "Other", level: 1, order: 14500, ignore: true }],
  ["other", { category_desc: "Other items.", group: "Other", level: 1, order: 14600 }],
]);

export function getCategoryConfig(category: string): BillingCategoryConfig {
  const normalizedKey = category.toLowerCase().trim();
  const directMatch = billingCategoryMap.get(normalizedKey);
  if (directMatch) {
    return directMatch;
  }

  // Dynamic heuristic fallback for unmapped subcategories
  if (normalizedKey.startsWith("experiment-") && (normalizedKey.includes("sms") || normalizedKey.includes("mms"))) {
    return {
      category_desc: "SMS destination routing traffic fees for " + category + ".",
      group: "SMS & MMS",
      level: 2,
      order: 4250,
      parentCategory: "sms-outbound",
    };
  }

  if (normalizedKey.startsWith("a2p-10dlc") || normalizedKey.includes("carrierfees") || normalizedKey.includes("pumping") || normalizedKey.includes("sms") || normalizedKey.includes("mms")) {
    return {
      category_desc: "SMS & Messaging traffic or registration charge for " + category + ".",
      group: "SMS & MMS",
      level: 1,
      order: 4900,
    };
  }

  if (normalizedKey.startsWith("channels-whatsapp")) {
    return {
      category_desc: "WhatsApp Business API conversation charge for " + category + ".",
      group: "WhatsApp Business API",
      level: 2,
      order: 5500,
      parentCategory: "channels-whatsapp",
    };
  }

  if (normalizedKey.startsWith("calls-") || normalizedKey.includes("voice")) {
    return {
      category_desc: "Voice traffic charge for " + category + ".",
      group: "Voice",
      level: 1,
      order: 1500,
    };
  }

  if (normalizedKey.startsWith("phone-numbers") || normalizedKey.startsWith("phonenumbers")) {
    return {
      category_desc: "Phone number monthly lease charge for " + category + ".",
      group: "Phone Numbers",
      level: 1,
      order: 6200,
    };
  }

  return (
    billingCategoryMap.get("other")
    || {
      category_desc: "Usage and cost details for " + category + ".",
      group: "Other",
      level: 1,
      order: 99999,
    }
  );
}
