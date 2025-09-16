

// Test CSS-based tab switching
test('CSS-based tab switching should work correctly', async () => {
  const mockTabs = [
    { id: 'tab1', name: 'Tab 1', icon: '1️⃣', description: 'First tab' },
    { id: 'tab2', name: 'Tab 2', icon: '2️⃣', description: 'Second tab' }
  ];
  
  let activeTab = 'tab1';
  
  const { container } = render(Page);
  
  // Verify CSS-based approach renders all tab content
  const tabContents = container.querySelectorAll('.tab-content');
  expect(tabContents.length).toBeGreaterThan(0);
  
  // Check that only active tab is visible
  tabContents.forEach(tabContent => {
    const isActive = tabContent.classList.contains('active');
    const computedStyle = getComputedStyle(tabContent);
    
    if (isActive) {
      // Active tab should be displayed
      expect(computedStyle.display).not.toBe('none');
    } else {
      // Inactive tabs should be hidden
      expect(computedStyle.display).toBe('none');
    }
  });
});
