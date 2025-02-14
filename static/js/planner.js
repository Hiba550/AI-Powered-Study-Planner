document.addEventListener('DOMContentLoaded', () => {
    // Constants
    const CURRENT_TIME = '2025-02-12 00:22:58';
    const CURRENT_USER = 'Hiba550';

    // DOM Elements with error checking
    const elements = {
        loadingScreen: document.getElementById('loading-screen'),
        inputView: document.getElementById('input-view'),
        planView: document.getElementById('plan-view'),
        generateBtn: document.getElementById('generate-btn'),
        planDisplay: document.getElementById('plan-display'),
        chatInput: document.getElementById('chat-input'),
        sendBtn: document.getElementById('send-btn'),
        chatMessages: document.getElementById('chat-messages'),
        datetimeElements: document.querySelectorAll('#datetime, #datetime-header'),
        backToInputBtn: document.getElementById('back-to-input'),
        editBtn: document.getElementById('edit-btn'),
        shareBtn: document.getElementById('share-btn'),
        steps: document.querySelectorAll('.step'),
        typingIndicator: document.querySelector('.typing-indicator'),
        notificationsContainer: document.getElementById('notifications-container')
    };

    // Validate required elements
    const validateElements = () => {
        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`Required element not found: ${key}`);
                showNotification(`UI Error: Missing ${key} element`, 'error');
            }
        }
    };

    // State Management with proper typing
    const state = {
        isGenerating: false,
        isChatting: false,
        currentPlanId: null,
        wordTypingInterval: null,
        lastMessageTimestamp: CURRENT_TIME
    };

    // Initialize application
    const initialize = () => {
        validateElements();
        initializeDatetime();
        initializeEventListeners();
    };

    // Datetime Management
    const initializeDatetime = () => {
        elements.datetimeElements.forEach(el => {
            if (el) el.textContent = CURRENT_TIME;
        });
    };

    // Event Listeners Management
    const initializeEventListeners = () => {
        if (elements.generateBtn) {
            elements.generateBtn.addEventListener('click', generatePlan);
        }

        if (elements.backToInputBtn) {
            elements.backToInputBtn.addEventListener('click', () => {
                switchView('input');
            });
        }

        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', handleChat);
        }

        if (elements.chatInput) {
            elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                }
            });

            // Auto-resize chat input
            elements.chatInput.addEventListener('input', () => {
                elements.chatInput.style.height = 'auto';
                elements.chatInput.style.height = `${elements.chatInput.scrollHeight}px`;
            });
        }
    };

    // View Management
    const switchView = (viewType) => {
        if (viewType === 'plan') {
            elements.inputView.classList.add('animate__animated', 'animate__fadeOut');
            elements.inputView.addEventListener('animationend', () => {
                elements.inputView.classList.add('hidden');
                elements.planView.classList.remove('hidden');
                elements.planView.classList.add('animate__animated', 'animate__fadeIn');
                initializeScrollButtons();
            }, { once: true });
        } else {
            elements.planView.classList.add('hidden');
            elements.inputView.classList.remove('hidden', 'animate__fadeOut');
            elements.inputView.classList.add('animate__fadeIn');
        }
    };

    // Input Validation with detailed error messages
    const validateInputs = () => {
        const inputs = {
            subjects: document.getElementById('subjects')?.value.trim(),
            days: parseInt(document.getElementById('days')?.value),
            hours: parseInt(document.getElementById('hours')?.value),
            goals: document.getElementById('goals')?.value.trim(),
            comments: document.getElementById('comments')?.value.trim()
        };

        const errors = [];
        
        if (!inputs.subjects) {
            errors.push('Please enter at least one subject');
        }
        
        if (!inputs.days || isNaN(inputs.days) || inputs.days < 1) {
            errors.push('Please enter a valid number of days (minimum 1)');
        }
        
        if (!inputs.hours || isNaN(inputs.hours) || inputs.hours < 1 || inputs.hours > 24) {
            errors.push('Please enter valid study hours (1-24)');
        }
        
        if (!inputs.goals) {
            errors.push('Please enter at least one learning goal');
        }

        return { 
            isValid: errors.length === 0, 
            errors, 
            inputs,
            formattedInputs: {
                subjects: inputs.subjects?.split(',').map(s => s.trim()).filter(Boolean),
                days: inputs.days,
                hours: inputs.hours,
                goals: inputs.goals?.split(',').map(g => g.trim()).filter(Boolean),
                comments: inputs.comments
            }
        };
    };

    // Loading Screen Management
    const toggleLoadingScreen = (show) => {
        if (!elements.loadingScreen) return;

        if (show) {
            elements.loadingScreen.classList.remove('hidden', 'animate__fadeOut');
            elements.loadingScreen.classList.add('animate__fadeIn');
        } else {
            elements.loadingScreen.classList.remove('animate__fadeIn');
            elements.loadingScreen.classList.add('animate__fadeOut');
            setTimeout(() => {
                elements.loadingScreen.classList.add('hidden');
            }, 300);
        }
    };

    // Scroll Button Management
    const initializeScrollButtons = () => {
        addScrollButton('plan-display');
        addScrollButton('chat-messages');
    };

    const addScrollButton = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const button = document.createElement('button');
        button.className = 'scroll-top-button';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        `;
        
        container.parentElement.appendChild(button);

        const handleScroll = () => {
            button.classList.toggle('visible', container.scrollTop > 300);
        };

        const scrollToTop = () => {
            container.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };

        container.addEventListener('scroll', handleScroll);
        button.addEventListener('click', scrollToTop);
    };

    // Continue in next part...
        // Text Formatting with Enhanced Markdown Support
        // Plan Generation with Complete Plan Display
const generatePlan = async () => {
    const validation = validateInputs();
    if (!validation.isValid) {
        validation.errors.forEach(error => showNotification(error, 'error'));
        return;
    }

    try {
        if (state.isGenerating) return;
        state.isGenerating = true;
        
        toggleLoadingScreen(true);
        if (elements.generateBtn) elements.generateBtn.disabled = true;

        const response = await fetch('/generate_plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validation.formattedInputs)
        });

        if (!response.ok) {
            throw new Error(`Failed to generate plan: ${response.statusText}`);
        }

        // Collect the entire plan before displaying
        const reader = response.body.getReader();
        let completePlan = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(5));
                        if (data.error) throw new Error(data.error);
                        if (data.content) {
                            completePlan += data.content;
                        }
                    } catch (e) {
                        console.error('Error processing chunk:', e);
                    }
                }
            }
        }

        // Only switch to plan view after collecting the complete plan
        if (completePlan) {
            switchView('plan');
            if (elements.planDisplay) {
                elements.planDisplay.innerHTML = '';
                displayCompletePlan(completePlan);
            }
            showNotification('Study plan generated successfully!', 'success');
        } else {
            throw new Error('No plan content generated');
        }

    } catch (error) {
        console.error('Plan generation error:', error);
        showNotification(error.message || 'Failed to generate plan', 'error');
    } finally {
        state.isGenerating = false;
        toggleLoadingScreen(false);
        if (elements.generateBtn) elements.generateBtn.disabled = false;
    }
};

// Display complete plan with sections
const displayCompletePlan = (planText) => {
    const lines = planText.split('\n');
    const planContainer = document.createElement('div');
    planContainer.className = 'plan-container animate__animated animate__fadeIn';

    let currentSection = null;

    lines.forEach(line => {
        const formatted = formatLine(line);
        if (!formatted) return;

        const lineElement = document.createElement('div');
        lineElement.className = `plan-line ${formatted.class} ${formatted.style}`;
        lineElement.innerHTML = formatted.text;

        // Group sections together
        if (formatted.type === '#') {
            currentSection = document.createElement('div');
            currentSection.className = 'plan-section mb-6';
            planContainer.appendChild(currentSection);
        }

        if (currentSection && ['#', '##', '###'].includes(formatted.type)) {
            currentSection.appendChild(lineElement);
        } else if (currentSection) {
            currentSection.appendChild(lineElement);
        } else {
            planContainer.appendChild(lineElement);
        }
    });

    if (elements.planDisplay) {
        elements.planDisplay.appendChild(planContainer);
        
        // Add animation classes with delay
        setTimeout(() => {
            const sections = elements.planDisplay.querySelectorAll('.plan-section');
            sections.forEach((section, index) => {
                section.style.animationDelay = `${index * 0.2}s`;
                section.classList.add('animate__fadeInUp');
            });
        }, 100);
    }
};

// Update the formatLine function to include section styling
const formatLine = (line) => {
    if (!line?.trim()) return null;

    const formats = {
        '#': { 
            class: 'main-header', 
            style: 'text-2xl font-bold text-indigo-600 mb-4'
        },
        '##': { 
            class: 'sub-header', 
            style: 'text-xl font-semibold text-indigo-500 mb-3'
        },
        '###': { 
            class: 'topic-header', 
            style: 'text-lg font-medium text-indigo-400 mb-2'
        },
        '*': { 
            class: 'important-point', 
            style: 'pl-4 border-l-4 border-yellow-400 bg-yellow-50 p-2 mb-2'
        },
        '-': { 
            class: 'regular-point', 
            style: 'pl-4 mb-2'
        },
        '>': { 
            class: 'tip-note', 
            style: 'bg-blue-50 p-3 rounded-lg mb-2'
        },
        '@': { 
            class: 'time-block', 
            style: 'bg-green-50 p-3 rounded-lg mb-2'
        },
        '!': { 
            class: 'warning', 
            style: 'bg-red-50 p-3 rounded-lg text-red-600 mb-2'
        },
        '$': { 
            class: 'progress-point', 
            style: 'bg-indigo-50 p-3 rounded-lg mb-2'
        }
    };

    for (const [marker, format] of Object.entries(formats)) {
        if (line.startsWith(marker)) {
            return {
                text: line.substring(marker.length).trim(),
                class: format.class,
                style: format.style,
                type: marker
            };
        }
    }

    return { 
        text: line, 
        class: 'text', 
        style: 'mb-2',
        type: 'text'
    };
};
    
        // Word-by-word Generation with Speed Control
        const typeWords = async (element, text, speed = 10) => {
            if (!element || !text) return;
    
            const words = text.split(' ');
            let currentText = '';
    
            for (const word of words) {
                currentText += word + ' ';
                element.textContent = currentText;
                await new Promise(resolve => setTimeout(resolve, speed));
                element.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        };
    
        // Plan Generation with Enhanced Error Handling
        
                        
                    
                
    
    
        // Create and Process Plan Lines
        const createPlanLine = () => {
            const line = document.createElement('div');
            line.className = 'plan-line';
            if (elements.planDisplay) elements.planDisplay.appendChild(line);
            return line;
        };
    
        const processLine = async (text) => {
            const formatted = formatLine(text);
            if (!formatted) return;
    
            const lineElement = document.createElement('div');
            lineElement.className = `plan-line ${formatted.class} ${formatted.style}`;
            if (elements.planDisplay) elements.planDisplay.appendChild(lineElement);
    
            await typeWords(lineElement, formatted.text);
            lineElement.classList.add('visible');
        };
    
        // Enhanced Chat Functionality
        const handleChat = async () => {
            if (!elements.chatInput || !elements.chatMessages) return;
            
            const message = elements.chatInput.value.trim();
            if (!message || state.isChatting) return;
    
            try {
                state.isChatting = true;
                elements.chatInput.value = '';
                elements.chatInput.disabled = true;
                if (elements.sendBtn) elements.sendBtn.disabled = true;
                if (elements.typingIndicator) elements.typingIndicator.classList.remove('hidden');
    
                // Add user message
                addMessage({
                    type: 'user',
                    content: message,
                    timestamp: CURRENT_TIME
                });
    
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
    
                if (!response.ok) {
                    throw new Error(`Chat error: ${response.statusText}`);
                }
    
                let aiResponse = '';
                const reader = response.body.getReader();
    
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
    
                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');
    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(5));
                                if (data.error) throw new Error(data.error);
                                
                                if (data.content) {
                                    aiResponse += data.content;
                                    updateLastAIMessage(aiResponse, data.timestamp || CURRENT_TIME);
                                }
                            } catch (e) {
                                console.error('Error processing chat response:', e);
                                continue;
                            }
                        }
                    }
                }
    
            } catch (error) {
                console.error('Chat error:', error);
                showNotification(error.message || 'Failed to send message', 'error');
            } finally {
                state.isChatting = false;
                elements.chatInput.disabled = false;
                if (elements.sendBtn) elements.sendBtn.disabled = false;
                if (elements.typingIndicator) elements.typingIndicator.classList.add('hidden');
                elements.chatInput.style.height = 'auto';
            }
        };
    
        // Message Handling
        const addMessage = ({ type, content, timestamp }) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${type} animate__animated animate__fadeInUp`;
            
            const messageContent = type === 'ai' ? formatAIResponse(content) : escapeHtml(content);
            
            messageDiv.innerHTML = `
                <div class="message-content ${type}-content">
                    ${messageContent}
                </div>
                <div class="message-timestamp">${timestamp || CURRENT_TIME}</div>
            `;
            
            if (elements.chatMessages) {
                elements.chatMessages.appendChild(messageDiv);
                elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
            }
        };
    
        const updateLastAIMessage = (content, timestamp) => {
            if (!elements.chatMessages) return;
    
            const lastMessage = elements.chatMessages.querySelector('.message-ai:last-child');
            if (lastMessage) {
                const contentDiv = lastMessage.querySelector('.ai-content');
                if (contentDiv) {
                    contentDiv.innerHTML = formatAIResponse(content);
                }
                if (timestamp) {
                    const timestampDiv = lastMessage.querySelector('.message-timestamp');
                    if (timestampDiv) {
                        timestampDiv.textContent = timestamp;
                    }
                }
            } else {
                addMessage({
                    type: 'ai',
                    content: content,
                    timestamp: timestamp || CURRENT_TIME
                });
            }
            
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        };
    
        // Utility Functions
        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
    
        const formatAIResponse = (text) => {
            if (!text) return '';
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                .replace(/\n/g, '<br>');
        };
    
        // Enhanced Notification System
        const showNotification = (message, type = 'info') => {
            if (!elements.notificationsContainer) return;
    
            const notification = document.createElement('div');
            notification.className = `notification notification-${type} animate__animated animate__fadeInRight`;
            
            const icon = type === 'error' ? '❌' : 
                        type === 'warning' ? '⚠️' : 
                        type === 'success' ? '✅' : 'ℹ️';
            
            notification.innerHTML = `
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${message}</div>
            `;
            
            elements.notificationsContainer.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
                setTimeout(() => notification.remove(), 500);
            }, 5000);
        };
    
        // Initialize the application
        initialize();
    });

