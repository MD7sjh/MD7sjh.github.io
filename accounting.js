tailwind.config = {
  theme: {
    extend: {
      colors: {
        dopamine: {
          orange: '#F4A06F', pink: '#F47F9F', yellow: '#EFC66B', mint: '#72C7A2',
          sky: '#76B7E5', purple: '#A58AD5', coral: '#EE9B8A', lime: '#A6CF8B'
        },
        calm: {
          ink: '#5B484E', mute: '#9A898F', bg: '#FFF8F5', line: '#F0E2DE'
        }
      },
      boxShadow: {
        soft: '0 18px 45px -22px rgba(0,0,0,.16)',
        floaty: '0 24px 60px -28px rgba(0,0,0,.22)'
      },
      fontFamily: {
        sans: ['Inter','system-ui','Segoe UI','sans-serif']
      }
    }
  }
};
