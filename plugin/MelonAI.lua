--[[
	MelonAI Plugin for Roblox Studio
	Connects your Roblox Studio with MelonAI web interface for AI-powered scripting
	
	SETUP:
	1. Save this as a .lua file in your Roblox Studio plugins folder
	2. Configure the settings below with your MelonAI credentials
	3. The plugin will automatically sync with your MelonAI web dashboard
]]

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")
local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterPlayer = game:GetService("StarterPlayer")
local StarterGui = game:GetService("StarterGui")
local Workspace = game:GetService("Workspace")

local CONFIG = {
	ENDPOINT = "",
	SESSION_ID = "",
	SECRET = "",
	POLL_INTERVAL = 3
}

local toolbar = plugin:CreateToolbar("MelonAI")
local connectButton = toolbar:CreateButton("Connect", "Connect to MelonAI", "rbxassetid://6031075938")
local syncButton = toolbar:CreateButton("Sync Context", "Send project context to MelonAI", "rbxassetid://6031075929")
local settingsButton = toolbar:CreateButton("Settings", "Open MelonAI Settings", "rbxassetid://6031075933")

local connected = false
local polling = false

local function log(message, isError)
	if isError then
		warn("[MelonAI] " .. message)
	else
		print("[MelonAI] " .. message)
	end
end

local function makeRequest(requestType, extraData)
	if CONFIG.ENDPOINT == "" or CONFIG.SESSION_ID == "" or CONFIG.SECRET == "" then
		return false, "Configuration incomplete"
	end
	
	local requestBody = {
		type = requestType,
		sessionId = CONFIG.SESSION_ID,
		secret = CONFIG.SECRET
	}
	
	if extraData then
		for k, v in pairs(extraData) do
			requestBody[k] = v
		end
	end
	
	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = CONFIG.ENDPOINT,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json"
			},
			Body = HttpService:JSONEncode(requestBody)
		})
	end)
	
	if success and response.Success then
		local decoded = HttpService:JSONDecode(response.Body)
		return true, decoded
	else
		if success then
			return false, "HTTP " .. tostring(response.StatusCode) .. ": " .. tostring(response.Body)
		else
			return false, tostring(response)
		end
	end
end

local function getParentFromPath(path)
	local parts = string.split(path, ".")
	local current = game
	
	for i, part in ipairs(parts) do
		if part == "game" then
			continue
		end
		
		local child = current:FindFirstChild(part)
		if child then
			current = child
		else
			if part == "ServerScriptService" then
				current = ServerScriptService
			elseif part == "ReplicatedStorage" then
				current = ReplicatedStorage
			elseif part == "StarterPlayer" then
				current = StarterPlayer
			elseif part == "StarterGui" then
				current = StarterGui
			elseif part == "Workspace" then
				current = Workspace
			elseif part == "StarterPlayerScripts" then
				current = StarterPlayer:FindFirstChild("StarterPlayerScripts") or StarterPlayer
			elseif part == "StarterCharacterScripts" then
				current = StarterPlayer:FindFirstChild("StarterCharacterScripts") or StarterPlayer
			else
				local folder = Instance.new("Folder")
				folder.Name = part
				folder.Parent = current
				current = folder
				log("Created folder: " .. part)
			end
		end
	end
	
	return current
end

local function createScript(action)
	local scriptClass = action.scriptType
	local name = action.name
	local parent = getParentFromPath(action.parent)
	local content = action.content or ""
	
	if scriptClass == "RemoteEvent" then
		local existing = parent:FindFirstChild(name)
		if existing then
			log("RemoteEvent already exists: " .. name)
			return true
		end
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = parent
		log("Created RemoteEvent: " .. name .. " in " .. action.parent)
		return true
	end
	
	if scriptClass == "RemoteFunction" then
		local existing = parent:FindFirstChild(name)
		if existing then
			log("RemoteFunction already exists: " .. name)
			return true
		end
		local remote = Instance.new("RemoteFunction")
		remote.Name = name
		remote.Parent = parent
		log("Created RemoteFunction: " .. name .. " in " .. action.parent)
		return true
	end
	
	local existing = parent:FindFirstChild(name)
	if existing then
		if action.type == "update" then
			existing.Source = content
			log("Updated " .. scriptClass .. ": " .. name .. " in " .. action.parent)
			return true
		elseif action.type == "delete" then
			existing:Destroy()
			log("Deleted " .. scriptClass .. ": " .. name .. " from " .. action.parent)
			return true
		elseif action.type == "create" then
			existing.Source = content
			log("Updated existing " .. scriptClass .. ": " .. name .. " in " .. action.parent)
			return true
		end
	end
	
	if action.type == "create" or action.type == "update" then
		local newScript
		if scriptClass == "Script" then
			newScript = Instance.new("Script")
		elseif scriptClass == "LocalScript" then
			newScript = Instance.new("LocalScript")
		elseif scriptClass == "ModuleScript" then
			newScript = Instance.new("ModuleScript")
		end
		
		if newScript then
			newScript.Name = name
			newScript.Source = content
			newScript.Parent = parent
			log("Created " .. scriptClass .. ": " .. name .. " in " .. action.parent)
			return true
		end
	end
	
	return false
end

local function processActions(actions)
	local processed = 0
	for _, action in ipairs(actions) do
		local success, err = pcall(function()
			createScript(action)
		end)
		
		if success then
			processed = processed + 1
		else
			log("Failed to process action for: " .. tostring(action.name) .. " - " .. tostring(err), true)
		end
	end
	return processed
end

local function pollForActions()
	log("Starting to poll for actions...")
	while polling do
		local success, response = makeRequest("getActions")
		
		if success then
			if response.actions and #response.actions > 0 then
				log("Received " .. #response.actions .. " actions from MelonAI")
				local processed = processActions(response.actions)
				log("Processed " .. processed .. " actions successfully")
			end
		else
			log("Poll failed: " .. tostring(response), true)
		end
		
		wait(CONFIG.POLL_INTERVAL)
	end
	log("Stopped polling")
end

local function connect()
	if CONFIG.ENDPOINT == "" then
		log("Please configure the endpoint URL in settings first!", true)
		return
	end
	
	log("Connecting to: " .. CONFIG.ENDPOINT)
	local success, response = makeRequest("ping")
	
	if success and response.success then
		connected = true
		polling = true
		connectButton:SetActive(true)
		log("Connected to MelonAI!")
		
		spawn(pollForActions)
	else
		log("Failed to connect to MelonAI: " .. tostring(response), true)
	end
end

local function disconnect()
	connected = false
	polling = false
	connectButton:SetActive(false)
	log("Disconnected from MelonAI")
end

local function collectProjectContext()
	local scripts = {}
	local services = {"ServerScriptService", "ReplicatedStorage", "StarterPlayer", "StarterGui"}
	
	local function scanContainer(container, path)
		for _, child in ipairs(container:GetChildren()) do
			local childPath = path .. "." .. child.Name
			
			if child:IsA("Script") or child:IsA("LocalScript") or child:IsA("ModuleScript") then
				table.insert(scripts, {
					name = child.Name,
					type = child.ClassName,
					parent = path,
					content = child.Source
				})
			end
			
			if child:IsA("Folder") or child:IsA("Model") or child:IsA("Configuration") then
				scanContainer(child, childPath)
			end
		end
	end
	
	for _, serviceName in ipairs(services) do
		local service = game:FindFirstChild(serviceName)
		if service then
			scanContainer(service, "game." .. serviceName)
		end
	end
	
	return {
		scripts = scripts,
		services = services
	}
end

local function syncContext()
	if not connected then
		log("Not connected. Please connect first.", true)
		return
	end
	
	local context = collectProjectContext()
	local success, response = makeRequest("context", {data = context})
	
	if success then
		log("Project context synced: " .. #context.scripts .. " scripts")
	else
		log("Failed to sync context: " .. tostring(response), true)
	end
end

connectButton.Click:Connect(function()
	if connected then
		disconnect()
	else
		connect()
	end
end)

syncButton.Click:Connect(syncContext)

local settingsWidget = plugin:CreateDockWidgetPluginGui(
	"MelonAISettings",
	DockWidgetPluginGuiInfo.new(
		Enum.InitialDockState.Float,
		false,
		false,
		320,
		280,
		280,
		250
	)
)
settingsWidget.Title = "MelonAI Settings"

local settingsFrame = Instance.new("Frame")
settingsFrame.Size = UDim2.new(1, 0, 1, 0)
settingsFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
settingsFrame.BorderSizePixel = 0
settingsFrame.Parent = settingsWidget

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.FillDirection = Enum.FillDirection.Vertical
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.Parent = settingsFrame

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 15)
padding.PaddingBottom = UDim.new(0, 15)
padding.PaddingLeft = UDim.new(0, 15)
padding.PaddingRight = UDim.new(0, 15)
padding.Parent = settingsFrame

local function createLabel(text)
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 0, 18)
	label.BackgroundTransparency = 1
	label.TextColor3 = Color3.fromRGB(180, 180, 180)
	label.TextSize = 13
	label.Text = text
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Font = Enum.Font.SourceSansSemibold
	label.Parent = settingsFrame
	return label
end

local function createTextBox(placeholder, getValue, setValue)
	local box = Instance.new("TextBox")
	box.Size = UDim2.new(1, 0, 0, 32)
	box.BackgroundColor3 = Color3.fromRGB(45, 45, 50)
	box.BorderSizePixel = 0
	box.TextColor3 = Color3.fromRGB(255, 255, 255)
	box.PlaceholderText = placeholder
	box.PlaceholderColor3 = Color3.fromRGB(100, 100, 100)
	box.TextSize = 12
	box.Font = Enum.Font.SourceSans
	box.ClearTextOnFocus = false
	box.Text = getValue()
	box.TextXAlignment = Enum.TextXAlignment.Left
	box.Parent = settingsFrame
	
	local boxPadding = Instance.new("UIPadding")
	boxPadding.PaddingLeft = UDim.new(0, 8)
	boxPadding.PaddingRight = UDim.new(0, 8)
	boxPadding.Parent = box
	
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 6)
	corner.Parent = box
	
	box.FocusLost:Connect(function()
		setValue(box.Text)
		log("Updated: " .. placeholder)
	end)
	
	return box
end

createLabel("Endpoint URL:")
createTextBox("https://your-app.vercel.app/api/plugin", 
	function() return CONFIG.ENDPOINT end,
	function(v) CONFIG.ENDPOINT = v end
)

createLabel("Session ID:")
createTextBox("From MelonAI website settings",
	function() return CONFIG.SESSION_ID end,
	function(v) CONFIG.SESSION_ID = v end
)

createLabel("Secret:")
createTextBox("From MelonAI website settings",
	function() return CONFIG.SECRET end,
	function(v) CONFIG.SECRET = v end
)

local spacer = Instance.new("Frame")
spacer.Size = UDim2.new(1, 0, 0, 5)
spacer.BackgroundTransparency = 1
spacer.Parent = settingsFrame

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, 0, 0, 20)
statusLabel.BackgroundTransparency = 1
statusLabel.TextColor3 = Color3.fromRGB(100, 200, 100)
statusLabel.TextSize = 12
statusLabel.Text = "Status: Not connected"
statusLabel.Font = Enum.Font.SourceSans
statusLabel.Parent = settingsFrame

spawn(function()
	while true do
		if connected then
			statusLabel.Text = "Status: Connected"
			statusLabel.TextColor3 = Color3.fromRGB(100, 200, 100)
		else
			statusLabel.Text = "Status: Disconnected"
			statusLabel.TextColor3 = Color3.fromRGB(200, 100, 100)
		end
		wait(1)
	end
end)

settingsButton.Click:Connect(function()
	settingsWidget.Enabled = not settingsWidget.Enabled
end)

log("MelonAI Plugin loaded! Click 'Settings' to configure, then 'Connect' to start.")
