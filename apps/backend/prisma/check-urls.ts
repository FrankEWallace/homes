const urls = [
  'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523805081446-ed9a7bb83eaa?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1589197331516-4d84944e6456?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544979592-371544138936?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1520116468816-95b69e847357?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551244072-5d12893278ab?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521334885634-9547ea28876c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540339832862-47459980783f?q=80&w=1200&auto=format&fit=crop'
];

async function check() {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`[${res.status}] ${url}`);
    } catch (e) {
      console.log(`[ERR] ${url}`);
    }
  }
}

check();
