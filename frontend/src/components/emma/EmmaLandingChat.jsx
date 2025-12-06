import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const EmmaLandingChat = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userType, setUserType] = useState(null); // workforce, employer, institution
  const [conversationStage, setConversationStage] = useState('greeting'); // greeting, asking_type, providing_info, ready_to_signup
  const messagesEndRef = useRef(null);

  // Emma's avatar image
  const EMMA_AVATAR = 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?w=200&h=200&fit=crop';

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-open Emma on landing page after 3 seconds
    const timer = setTimeout(() => {
      if (!isOpen && messages.length === 0) {
        setIsOpen(true);
        sendEmmaMessage(getGreeting());
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
    if (hour >= 18) greeting = 'Good evening';

    return `${greeting}! 👋 I'm Emma, your HR Bank assistant. I'm here to help you understand how HR Bank can benefit you. Are you a **workforce member** looking for quality jobs, an **employer** seeking verified workers, or an **institution** that trains and certifies workers?`;
  };

  const sendEmmaMessage = (content) => {
    const emmaMessage = {
      role: 'assistant',
      content: content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, emmaMessage]);
  };

  const handleUserMessage = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Process based on stage
    processUserInput(inputMessage.toLowerCase());
    setInputMessage('');
  };

  const processUserInput = (input) => {
    if (conversationStage === 'greeting') {
      // Detect user type
      if (input.includes('workforce') || input.includes('worker') || input.includes('employee') || input.includes('job')) {
        setUserType('workforce');
        setConversationStage('providing_info');
        sendEmmaMessage(
          "Great! As a **workforce member**, HR Bank helps you:\n\n" +
          "✓ Find quality jobs with verified employers\n" +
          "✓ Get matched based on your skills, location, and availability\n" +
          "✓ Ensure compliance with Ontario employment standards (minimum wage $17.60/hr, vacation pay, overtime)\n" +
          "✓ Build your professional profile with credentials and certifications\n" +
          "✓ Apply to jobs and receive direct offers from employers\n\n" +
          "Would you like me to tell you more about any of these features?"
        );
      } else if (input.includes('employer') || input.includes('hire') || input.includes('business') || input.includes('company')) {
        setUserType('employer');
        setConversationStage('providing_info');
        sendEmmaMessage(
          "Excellent! As an **employer**, HR Bank helps you:\n\n" +
          "✓ Find verified, compliant workers matched to your needs\n" +
          "✓ Post jobs and get candidates ranked by skills, distance, and availability\n" +
          "✓ Ensure compliance with Ontario employment laws (WSIB, T4 classification, ESA requirements)\n" +
          "✓ Manage shifts, rosters, and payroll automatically\n" +
          "✓ Conduct video interviews and send job offers directly\n\n" +
          "Would you like to know more about our job matching system or compliance features?"
        );
      } else if (input.includes('institution') || input.includes('school') || input.includes('college') || input.includes('training') || input.includes('certif')) {
        setUserType('institution');
        setConversationStage('providing_info');
        sendEmmaMessage(
          "Perfect! As an **institution**, HR Bank helps you:\n\n" +
          "✓ Certify and verify your graduates' credentials\n" +
          "✓ Connect your trained workers with quality employers\n" +
          "✓ Track your graduates' employment success\n" +
          "✓ Build partnerships with employers seeking trained workers\n" +
          "✓ Ensure your certifications are recognized in the marketplace\n\n" +
          "Would you like to learn more about our certification verification system?"
        );
      } else {
        // Unclear response, ask again
        sendEmmaMessage(
          "I'm here to help! Could you please let me know if you're:\n\n" +
          "**1. Workforce** - Looking for a job\n" +
          "**2. Employer** - Looking to hire workers\n" +
          "**3. Institution** - Training and certifying workers\n\n" +
          "Just type your choice!"
        );
      }
    } else if (conversationStage === 'providing_info') {
      // User is asking follow-up questions
      if (input.includes('sign up') || input.includes('register') || input.includes('create account') || 
          input.includes('join') || input.includes('get started') || input.includes('yes')) {
        setConversationStage('ready_to_signup');
        showSignupOptions();
      } else if (input.includes('no') || input.includes('done') || input.includes('thanks') || input.includes('thank')) {
        setConversationStage('ready_to_signup');
        showSignupOptions();
      } else {
        // Provide more information based on user type
        provideAdditionalInfo(input);
      }
    } else if (conversationStage === 'ready_to_signup') {
      // Already showed signup, just acknowledge
      sendEmmaMessage("Great! Click the button above to get started. I'm here if you need anything else! 😊");
    }
  };

  const provideAdditionalInfo = (input) => {
    if (userType === 'workforce') {
      if (input.includes('match') || input.includes('job') || input.includes('find')) {
        sendEmmaMessage(
          "Our job matching is intelligent! We match you based on:\n\n" +
          "📍 **Distance** (35%) - Proximity to your location\n" +
          "📅 **Availability** (35%) - Your schedule flexibility\n" +
          "🎓 **Certifications** (20%) - Required credentials\n" +
          "💪 **Skills** (10%) - Job requirements\n\n" +
          "This ensures you get relevant opportunities near you! Ready to create your account?"
        );
        setTimeout(() => setConversationStage('ready_to_signup'), 2000);
      } else if (input.includes('pay') || input.includes('wage') || input.includes('money') || input.includes('salary')) {
        sendEmmaMessage(
          "HR Bank ensures compliance with Ontario laws:\n\n" +
          "💰 Minimum wage: $17.60/hour\n" +
          "📊 Overtime: 1.5x after 44 hours/week\n" +
          "🏖️ Vacation pay: 4% of earnings\n" +
          "📝 Proper T4 classification\n" +
          "🛡️ WSIB coverage\n\n" +
          "All employers on our platform are verified! Ready to get started?"
        );
        setTimeout(() => setConversationStage('ready_to_signup'), 2000);
      } else {
        sendEmmaMessage("That's a great question! To learn more and access all features, you'll need to create an account. Ready to sign up?");
        setTimeout(() => setConversationStage('ready_to_signup'), 1000);
      }
    } else if (userType === 'employer') {
      if (input.includes('match') || input.includes('find') || input.includes('candidate')) {
        sendEmmaMessage(
          "Our matching engine finds the best candidates for you:\n\n" +
          "1. Post your job with requirements\n" +
          "2. We automatically match workers based on distance, availability, skills, and certifications\n" +
          "3. Review ranked candidates with match scores\n" +
          "4. Send interview invitations or direct offers\n" +
          "5. Conduct video interviews in-app\n\n" +
          "It's that simple! Ready to create your employer account?"
        );
        setTimeout(() => setConversationStage('ready_to_signup'), 2000);
      } else if (input.includes('compliance') || input.includes('legal') || input.includes('law')) {
        sendEmmaMessage(
          "We handle compliance automatically:\n\n" +
          "✓ Minimum wage enforcement ($17.60)\n" +
          "✓ Overtime calculations (1.5x)\n" +
          "✓ Vacation and holiday pay tracking\n" +
          "✓ T4 reporting\n" +
          "✓ WSIB verification\n" +
          "✓ ESA requirement adherence\n\n" +
          "No more compliance worries! Want to get started?"
        );
        setTimeout(() => setConversationStage('ready_to_signup'), 2000);
      } else {
        sendEmmaMessage("Great question! To access our full platform and start hiring, you'll need to create an employer account. Shall we get you registered?");
        setTimeout(() => setConversationStage('ready_to_signup'), 1000);
      }
    } else if (userType === 'institution') {
      sendEmmaMessage("To explore all our institution features and start certifying workers, you'll need to create an account. Would you like to register now?");
      setTimeout(() => setConversationStage('ready_to_signup'), 1000);
    }
  };

  const showSignupOptions = () => {
    const signupUrl = userType ? `/signup?type=${userType}` : '/signup';
    const typeLabel = userType === 'workforce' ? 'Workforce' : 
                      userType === 'employer' ? 'Employer' : 
                      userType === 'institution' ? 'Institution' : 'your';

    sendEmmaMessage(
      `Perfect! I'm excited to have you join HR Bank! 🎉\n\n` +
      `Click the button below to create your ${typeLabel} account and get started:\n\n` +
      `**[Create ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} Account →](${signupUrl})**\n\n` +
      `Already have an account? [Sign in here](${userType ? `/login?type=${userType}` : '/login'})\n\n` +
      `I'll be here to help you once you're registered! 😊`
    );
  };

  const handleSignupClick = () => {
    const signupUrl = userType ? `/signup?type=${userType}` : '/signup';
    navigate(signupUrl);
  };

  const handleLoginClick = () => {
    const loginUrl = userType ? `/login?type=${userType}` : '/login';
    navigate(loginUrl);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 flex items-center justify-center bg-blue-600"
        title="Chat with Emma"
      >
        <img
          src={EMMA_AVATAR}
          alt="Emma"
          className="w-14 h-14 rounded-full object-cover border-2 border-white"
        />
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
          💬
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={EMMA_AVATAR}
            alt="Emma"
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
          <div>
            <h3 className="font-semibold text-sm">Emma</h3>
            <p className="text-xs opacity-90">Your HR Bank Guide</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
          >
            {msg.role === 'assistant' && (
              <img
                src={EMMA_AVATAR}
                alt="Emma"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Signup Buttons (shown after conversation) */}
        {conversationStage === 'ready_to_signup' && userType && (
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSignupClick}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Create {userType.charAt(0).toUpperCase() + userType.slice(1)} Account →
            </button>
            <button
              onClick={handleLoginClick}
              className="w-full px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
            >
              Already have an account? Sign In
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleUserMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmmaLandingChat;
